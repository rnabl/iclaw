// Sendblue message processor - handles incoming messages and generates AI responses

import { createLogger, containsProFeature } from '@iclaw/core';
import { MESSAGES, SKILLS, ONBOARDING_STATE } from '@iclaw/core';
import type { User, ConversationContext } from '@iclaw/core';
import type { SkillId } from '@iclaw/core';
import type { ParsedMessage } from '@iclaw/sendblue';
import {
  getOrCreateUser,
  logUsage,
  updateOnboardingState,
  updateSelectedSkills,
  hasRequiredIntegrations,
} from '@iclaw/database';
import { createSendblueClient } from '@iclaw/sendblue';
import {
  SkillRegistry,
  buildSystemPrompt,
  getProUpsellMessage,
} from '@iclaw/skills';
import { generateAIResponse } from './ai';
import { sendToOpenClaw } from './openclaw';
import { generateOAuthLink } from '../routes/oauth';

// Feature flag: use OpenClaw Gateway instead of direct Anthropic
const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';

const log = createLogger('MessageProcessor:Sendblue');

/**
 * Process an incoming Sendblue message
 */
export async function processMessageSendblue(message: ParsedMessage): Promise<void> {
  const { sender, text } = message;

  log.info('Processing message', { sender: sender.substring(0, 6) + '****' });

  try {
    // Get or create user
    const user = await getOrCreateUser(sender);
    log.debug('User context', { tier: user.tier, name: user.name });

    // Build response based on user state
    let response: string;

    // Check for special flows first
    const specialResponse = await handleSpecialFlows(user, text);

    if (specialResponse) {
      response = specialResponse;
    } else {
      // Generate AI response
      response = await generateResponse(user, text, message);
    }

    // Send response via Sendblue
    await sendResponse(sender, response);

    // Log usage
    await logUsage(sender, 'message');
  } catch (error) {
    log.error('Error processing message', error);

    // Send error message to user
    try {
      const client = createSendblueClient();
      await client.sendMessage(
        sender,
        "Sorry, I ran into an issue. Can you try that again?"
      );
    } catch (sendError) {
      log.error('Error sending error message', sendError);
    }
  }
}

/**
 * Handle onboarding and special conversation flows
 */
async function handleSpecialFlows(user: User, text: string): Promise<string | null> {
  // Safe access - columns might not exist yet
  const state = (user as any).onboarding_state || ONBOARDING_STATE.NEW;

  // ============================================
  // NEW USER - Send welcome with skill options
  // ============================================
  if (state === ONBOARDING_STATE.NEW) {
    try {
      await updateOnboardingState(user.phone_number, ONBOARDING_STATE.SELECTING_SKILLS);
    } catch (e) {
      log.warn('Could not update onboarding state (column may not exist yet)');
    }
    return MESSAGES.WELCOME;
  }

  // ============================================
  // SELECTING SKILLS - Parse their selection
  // ============================================
  if (state === ONBOARDING_STATE.SELECTING_SKILLS) {
    // Check if it's a greeting - they might be confused, resend welcome
    const greetings = ['hey', 'hi', 'hello', 'yo', 'sup', 'start', 'help'];
    if (greetings.includes(text.toLowerCase().trim())) {
      return MESSAGES.WELCOME;
    }

    const selectedSkills = parseSkillSelection(text);

    if (selectedSkills.length === 0) {
      return `I didn't catch that. Reply with numbers to select:

1️⃣ Email
2️⃣ Calendar
3️⃣ Food
4️⃣ Golf

For example: "1 2" or "1, 3, 4"`;
    }

    try {
      await updateSelectedSkills(user.phone_number, selectedSkills);
    } catch (e) {
      log.warn('Could not save selected skills (column may not exist yet)');
    }

    const skillNames = selectedSkills.map((id) => {
      const skill = SKILLS[id];
      return `${skill.emoji} ${skill.name}`;
    });

    const needsOAuth = selectedSkills.some((id) => SKILLS[id].oauthRequired);

    if (needsOAuth) {
      const baseUrl = process.env.API_BASE_URL || 'https://iclaw-novw8.ondigitalocean.app';
      const oauthLink = generateOAuthLink(user.id, baseUrl);

      try {
        await updateOnboardingState(user.phone_number, ONBOARDING_STATE.AWAITING_OAUTH);
      } catch (e) {
        log.warn('Could not update onboarding state (column may not exist yet)');
      }

      return `${MESSAGES.SKILL_SELECTION_CONFIRM(skillNames)}

${MESSAGES.OAUTH_PROMPT(oauthLink)}`;
    } else {
      try {
        await updateOnboardingState(user.phone_number, ONBOARDING_STATE.READY);
      } catch (e) {
        log.warn('Could not update onboarding state (column may not exist yet)');
      }

      return `${MESSAGES.SKILL_SELECTION_CONFIRM(skillNames)}

You're all set! What would you like to do?`;
    }
  }

  // ============================================
  // AWAITING OAUTH - Check if they've authenticated
  // ============================================
  if (state === ONBOARDING_STATE.AWAITING_OAUTH) {
    try {
      const { complete } = await hasRequiredIntegrations(
        user.id,
        (user as any).selected_skills || []
      );

      if (complete) {
        try {
          await updateOnboardingState(user.phone_number, ONBOARDING_STATE.READY);
        } catch (e) {
          log.warn('Could not update onboarding state');
        }
        return MESSAGES.OAUTH_SUCCESS(['Gmail', 'Calendar']);
      }
    } catch (e) {
      log.warn('Could not check integrations (table may not exist yet)');
    }

    const baseUrl = process.env.API_BASE_URL || 'https://iclaw-novw8.ondigitalocean.app';
    const oauthLink = generateOAuthLink(user.id, baseUrl);

    return `Looks like you haven't connected your account yet.

Tap to sign in with Google:
${oauthLink}

Come back here when you're done!`;
  }

  // ============================================
  // READY - Normal operation, check for Pro upsell
  // ============================================
  if (state === ONBOARDING_STATE.READY) {
    if (user.tier !== 'pro') {
      const proFeature = containsProFeature(text);
      if (proFeature) {
        return getProUpsellMessage(proFeature, process.env.STRIPE_PRO_LINK || '');
      }
    }
  }

  // ============================================
  // PLAN SELECTION - Handle "Starter" or "Pro" at any point
  // ============================================
  const lowerText = text.toLowerCase().trim();
  
  if (lowerText === 'starter' || lowerText.includes('starter plan')) {
    const link = process.env.STRIPE_STARTER_LINK || '';
    return `Great choice! 🎯

Here's your Starter plan payment link:
${link}

Starter Plan - $19/month includes:
• Text & web browsing
• Email management
• Calendar & reminders
• Weather & news
• Basic automations

Once payment is complete, I'll get you set up with your personalized AI assistant!

Any questions about the plan?`;
  }

  if (lowerText === 'pro' || lowerText.includes('pro plan')) {
    const link = process.env.STRIPE_PRO_LINK || '';
    return `Excellent choice! 🚀

Here's your Pro plan payment link:
${link}

Pro Plan - $49/month includes:
• Everything in Starter
• Automated alerts & snipers
• Scheduled tasks (crons)
• Priority booking
• 24/7 monitoring

Once payment is complete, you'll have full access to all features!

Any questions about the plan?`;
  }

  return null;
}

/**
 * Parse skill selection from user input
 */
function parseSkillSelection(text: string): SkillId[] {
  const normalized = text.toLowerCase().trim();
  const selected: SkillId[] = [];

  if (normalized === 'all' || normalized.includes('all')) {
    return ['email', 'calendar', 'food', 'golf'];
  }

  const numberMap: Record<string, SkillId> = {
    '1': 'email',
    '2': 'calendar',
    '3': 'food',
    '4': 'golf',
  };

  for (const [num, skill] of Object.entries(numberMap)) {
    if (normalized.includes(num)) {
      selected.push(skill);
    }
  }

  if (selected.length === 0) {
    const nameMap: Record<string, SkillId> = {
      email: 'email',
      mail: 'email',
      gmail: 'email',
      calendar: 'calendar',
      schedule: 'calendar',
      food: 'food',
      delivery: 'food',
      order: 'food',
      restaurant: 'food',
      golf: 'golf',
      tee: 'golf',
    };

    for (const [keyword, skill] of Object.entries(nameMap)) {
      if (normalized.includes(keyword) && !selected.includes(skill)) {
        selected.push(skill);
      }
    }
  }

  return selected;
}

/**
 * Generate AI response for normal messages
 * Routes through OpenClaw Gateway if enabled, otherwise uses direct Anthropic
 */
async function generateResponse(
  user: User,
  text: string,
  message: ParsedMessage
): Promise<string> {
  // If OpenClaw is enabled, route through the Gateway
  // OpenClaw handles memory, context, and skill execution natively
  if (USE_OPENCLAW) {
    log.debug('Routing to OpenClaw Gateway');
    return sendToOpenClaw(text, user.phone_number);
  }

  // Fallback: Direct Anthropic integration (legacy)
  const matchedSkill = SkillRegistry.findMatching(text);

  if (matchedSkill && user.tier !== 'none') {
    const canAccess = SkillRegistry.getForTier(user.tier).includes(matchedSkill);

    if (!canAccess) {
      return getProUpsellMessage(matchedSkill.name, process.env.STRIPE_PRO_LINK || '');
    }
  }

  const context: ConversationContext = {
    user,
    messages: [],
    currentMessage: text,
    sender: message.sender,
  };

  const skillPrompts = SkillRegistry.getForTier(user.tier).map((s) => s.systemPrompt);
  const systemPrompt = buildSystemPrompt(user, skillPrompts);

  return generateAIResponse(systemPrompt, context);
}

/**
 * Send response via Sendblue
 */
async function sendResponse(phoneNumber: string, message: string): Promise<void> {
  const client = createSendblueClient();

  log.info('Sending response', {
    to: phoneNumber.substring(0, 6) + '****',
    messageLength: message.length,
  });

  await client.sendMessage(phoneNumber, message);
}
