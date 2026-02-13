// Core constants for iClaw

/**
 * Available skills/integrations
 */
export const SKILLS = {
  email: {
    id: 'email',
    number: 1,
    emoji: '📧',
    name: 'Email',
    description: 'Read, summarize, and send emails',
    oauthRequired: true,
    oauthProvider: 'google',
    scopes: ['gmail.readonly', 'gmail.send'],
  },
  calendar: {
    id: 'calendar',
    number: 2,
    emoji: '📅',
    name: 'Calendar',
    description: 'Check schedule, book meetings',
    oauthRequired: true,
    oauthProvider: 'google',
    scopes: ['calendar.readonly', 'calendar.events'],
  },
  food: {
    id: 'food',
    number: 3,
    emoji: '🍕',
    name: 'Food',
    description: 'Order delivery, make reservations',
    oauthRequired: false,
  },
  golf: {
    id: 'golf',
    number: 4,
    emoji: '🏌️',
    name: 'Golf',
    description: 'Book tee times, snipe reservations',
    oauthRequired: false,
  },
} as const;

export type SkillId = keyof typeof SKILLS;

/**
 * Pricing tiers
 */
export const TIERS = {
  none: {
    name: 'None',
    price: 0,
    features: [],
  },
  starter: {
    name: 'Starter',
    price: 19,
    features: [
      'On-demand AI tasks',
      'Book golf tee times',
      'Order food',
      'Restaurant reservations',
      'Email & calendar access',
    ],
  },
  pro: {
    name: 'Pro',
    price: 49,
    features: [
      'Everything in Starter',
      'Automated alerts (snipers)',
      'Scheduled tasks (crons)',
      'Priority booking',
      '24/7 monitoring',
    ],
  },
} as const;

/**
 * Pro-only features (require tier upgrade)
 */
export const PRO_ONLY_FEATURES = [
  'sniper',
  'alert',
  'monitor',
  'watch',
  'notify me when',
  'schedule',
  'every day',
  'every week',
  'cron',
  'automated',
] as const;

/**
 * Onboarding states
 */
export const ONBOARDING_STATE = {
  NEW: 'new',                        // First message ever
  SELECTING_SKILLS: 'selecting',     // Choosing what they want
  SELECTING_PLAN: 'selecting_plan',  // Choosing Starter or Pro
  AWAITING_PAYMENT: 'awaiting_payment', // Waiting for Stripe payment
  SETTING_UP_SKILLS: 'setting_up',   // Connecting OAuth one by one
  AWAITING_OAUTH: 'awaiting_oauth',  // Waiting for OAuth completion
  READY: 'ready',                    // Setup complete, ready to use
} as const;

export type OnboardingState = typeof ONBOARDING_STATE[keyof typeof ONBOARDING_STATE];

/**
 * Default AI model
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Max conversation history to send to AI
 */
export const MAX_HISTORY_MESSAGES = 20;

/**
 * Billing period format
 */
export const BILLING_PERIOD_FORMAT = 'YYYY-MM';

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Error messages
 */
export const ERRORS = {
  UNAUTHORIZED: 'Unauthorized',
  USER_NOT_FOUND: 'User not found',
  INVALID_TIER: 'Invalid subscription tier',
  PRO_REQUIRED: 'This feature requires a Pro subscription',
  INVALID_WEBHOOK: 'Invalid webhook signature',
  RATE_LIMITED: 'Too many requests, please slow down',
  INTERNAL_ERROR: 'Something went wrong, please try again',
} as const;

/**
 * Success messages
 */
export const MESSAGES = {
  WELCOME: `Welcome to iClaw 🦞

Your own OpenClaw assistant.
Private. Isolated. Running 24/7.

What do you want help with?
1️⃣ Email & Calendar
2️⃣ Research & Web browsing
3️⃣ Food & Reservations
4️⃣ All of the above`,

  SKILL_SELECTION_CONFIRM: (skills: string[]) => `Great choices! You selected:
${skills.map(s => `✓ ${s}`).join('\n')}`,

  PLAN_OPTIONS: `Perfect! Choose your plan:

Starter - $19/mo
• Unlimited messages
• Email & calendar
• Web browsing & research

Pro - $49/mo
• Everything in Starter
• Automated tasks & alerts
• Priority support

Reply 'Starter' or 'Pro'`,

  PAYMENT_LINK: (plan: string, link: string) => `${plan} plan - great choice!

Tap to pay:
${link}`,

  PAYMENT_RECEIVED: `Payment received ✅

Spinning up your assistant...

✓ Your own AI instance
✓ Your data stays yours
✓ Available 24/7`,

  SETUP_GMAIL: (link: string) => `Let's connect your skills 👇

📧 Gmail - Tap to connect:
${link}`,

  SETUP_CALENDAR: (link: string) => `Gmail connected ✅

📅 Calendar - Tap to connect:
${link}`,

  SETUP_COMPLETE: `All set! 🦞

Your assistant is live. Just text me anytime.

Try: "What's on my calendar tomorrow?"`,

  OAUTH_PROMPT: (link: string) => `Let's connect your account.

Tap to sign in with Google:
${link}

Come back here when you're done!`,

  OAUTH_SUCCESS: (services: string[]) => `✅ Connected: ${services.join(', ')}

You're all set! Try saying:
• "Read my latest emails"
• "What's on my calendar today?"
• "Book me a tee time Saturday"

What would you like to do?`,

  READY: (name?: string) => `${name ? `Hey ${name}! ` : ''}What can I help you with?`,

  PAYMENT_SUCCESS: (name: string) => `✅ You're in! Welcome to iClaw.

Hey ${name}! What would you like to do first?

🏌️ Book a tee time
🍕 Order food
📅 Check your calendar
📧 Read emails`,

  ASK_NAME: `✅ Connected! One more thing - what's your first name?`,

  PRO_UPSELL: (feature: string) => `${feature} is a Pro feature - it monitors 24/7 and alerts you automatically.

Upgrade to Pro ($49/mo)?`,

  SUBSCRIPTION_EXPIRED: `Hey! Looks like your subscription ended.

Want to pick back up?

⭐ Starter ($19/mo)
🚀 Pro ($49/mo)`,
} as const;
