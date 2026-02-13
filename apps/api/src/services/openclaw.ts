// OpenClaw Gateway client - routes messages through OpenClaw for context, memory, and skills

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

/**
 * Send a message to OpenClaw Gateway and get a response
 * OpenClaw handles memory, context, and skill execution
 */
export async function sendToOpenClaw(
  userMessage: string,
  conversationId?: string
): Promise<string> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    log.error('OpenClaw Gateway not configured');
    throw new Error('OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN must be set');
  }

  const endpoint = `${gatewayUrl}/v1/chat/completions`;

  log.debug('Sending to OpenClaw', { 
    endpoint,
    messageLength: userMessage.length,
    conversationId 
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
        // OpenClaw manages its own context/memory per conversation
        // We could pass conversation_id if OpenClaw supports it
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
