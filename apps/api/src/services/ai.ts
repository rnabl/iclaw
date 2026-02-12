// AI service - handles Claude API interactions

import Anthropic from '@anthropic-ai/sdk';
import { createLogger, DEFAULT_MODEL, MAX_HISTORY_MESSAGES } from '@iclaw/core';
import type { ConversationContext } from '@iclaw/core';

const log = createLogger('AI');

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

/**
 * Generate AI response using Claude
 */
export async function generateAIResponse(
  systemPrompt: string,
  context: ConversationContext
): Promise<string> {
  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  log.debug('Generating AI response', { model });

  try {
    // Build messages array
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history (limited)
    const historyStart = Math.max(0, context.messages.length - MAX_HISTORY_MESSAGES);
    for (let i = historyStart; i < context.messages.length; i++) {
      const msg = context.messages[i];
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: context.currentMessage,
    });

    // Call Claude API
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === 'text');
    
    if (!textContent || textContent.type !== 'text') {
      log.warn('No text content in AI response');
      return "I'm having trouble responding right now. Can you try again?";
    }

    log.debug('AI response generated', { 
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return textContent.text;
  } catch (error) {
    log.error('AI generation error', error);

    // Handle specific errors
    if (error instanceof Anthropic.RateLimitError) {
      return "I'm getting a lot of requests right now. Give me a moment and try again.";
    }

    if (error instanceof Anthropic.AuthenticationError) {
      log.error('Anthropic API key invalid');
      return "I'm having a configuration issue. Please try again later.";
    }

    throw error;
  }
}

/**
 * Generate a quick response without full context (for simple queries)
 */
export async function quickResponse(prompt: string): Promise<string> {
  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  return textContent?.type === 'text' ? textContent.text : '';
}
