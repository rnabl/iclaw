// OpenClaw Gateway client - routes messages through OpenClaw for context, memory, and skills
// Supports both single-instance (shared) and multi-instance (per-user) modes

import { createLogger, stripMarkdown } from '@iclaw/core';

const log = createLogger('OpenClaw');

interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenClawResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UserOpenClawConfig {
  port: number;
  token: string;
}

/**
 * Send a message to OpenClaw Gateway and get a response
 * OpenClaw handles memory, context, and skill execution
 * 
 * @param userMessage - The message from the user
 * @param userId - Unique identifier for the user (phone number)
 * @param userConfig - Optional per-user OpenClaw config (port/token) for multi-instance mode
 */
export async function sendToOpenClaw(
  userMessage: string,
  userId: string,
  userConfig?: UserOpenClawConfig
): Promise<string> {
  // Determine endpoint and token based on mode
  let gatewayUrl: string;
  let gatewayToken: string;

  if (userConfig?.port && userConfig?.token) {
    // Multi-instance mode: route to user's dedicated container
    const baseHost = process.env.OPENCLAW_GATEWAY_HOST || '104.131.111.116';
    gatewayUrl = `http://${baseHost}:${userConfig.port}`;
    gatewayToken = userConfig.token;
    log.debug('Using per-user OpenClaw instance', { port: userConfig.port });
  } else {
    // Single-instance mode: shared gateway with user isolation via user field
    gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || '';
    gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
  }

  if (!gatewayUrl || !gatewayToken) {
    log.error('OpenClaw Gateway not configured');
    throw new Error('OpenClaw Gateway URL and token must be configured');
  }

  const endpoint = `${gatewayUrl}/v1/chat/completions`;

  log.debug('Sending to OpenClaw', { 
    endpoint,
    messageLength: userMessage.length,
    userId: userId.substring(0, 6) + '****', // Mask for logs
  });

  try {
    const messages: OpenClawMessage[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages,
        // Pass user ID for session isolation - OpenClaw derives a stable 
        // session key from this, giving each user their own memory/context
        user: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('OpenClaw API error', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
    }

    const data: OpenClawResponse = await response.json();

    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      log.warn('No content in OpenClaw response');
      return "I'm having trouble responding right now. Can you try again?";
    }

    log.debug('OpenClaw response received', {
      tokens: data.usage?.total_tokens,
      finishReason: data.choices?.[0]?.finish_reason,
    });

    // Strip markdown for iMessage compatibility
    return stripMarkdown(assistantMessage);
  } catch (error) {
    log.error('OpenClaw request failed', error);

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return "I'm having trouble connecting to my brain. Please try again in a moment.";
    }

    throw error;
  }
}

/**
 * Check if OpenClaw Gateway is healthy
 */
export async function checkOpenClawHealth(): Promise<boolean> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    return false;
  }

  try {
    // Simple health check - send a minimal request
    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
