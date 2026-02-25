/**
 * Ephemeral Access Tokens
 * 
 * Short-lived tokens for workflow execution (max 30 minutes).
 * Automatically expire and can be revoked immediately after use.
 */

import { randomBytes } from 'crypto';

export interface EphemeralToken {
  token: string;
  tenantId: string;
  workflowId: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

// In-memory store (use Redis in production)
const tokenStore: Map<string, EphemeralToken> = new Map();

// Cleanup interval
setInterval(() => {
  const now = new Date();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now || data.revoked) {
      tokenStore.delete(token);
    }
  }
}, 60000); // Clean up every minute

/**
 * Create an ephemeral access token
 */
export async function createEphemeralToken(params: {
  tenantId: string;
  workflowId: string;
  expiresIn: number;  // Seconds
  scopes: string[];
}): Promise<EphemeralToken> {
  const { tenantId, workflowId, expiresIn, scopes } = params;

  // Generate cryptographically secure token
  const token = `etk_${randomBytes(32).toString('base64url')}`;

  const tokenData: EphemeralToken = {
    token,
    tenantId,
    workflowId,
    scopes,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    revoked: false
  };

  tokenStore.set(token, tokenData);

  return tokenData;
}

/**
 * Validate and retrieve token
 */
export async function validateToken(token: string): Promise<EphemeralToken | null> {
  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    return null;
  }

  // Check expiration
  if (tokenData.expiresAt < new Date()) {
    tokenStore.delete(token);
    return null;
  }

  // Check revocation
  if (tokenData.revoked) {
    return null;
  }

  return tokenData;
}

/**
 * Revoke a token immediately
 */
export async function revokeToken(token: string): Promise<boolean> {
  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    return false;
  }

  tokenData.revoked = true;
  tokenStore.delete(token);
  
  return true;
}

/**
 * Check if token has specific scope
 */
export function hasScope(tokenData: EphemeralToken, requiredScope: string): boolean {
  return tokenData.scopes.includes('*') || tokenData.scopes.includes(requiredScope);
}

/**
 * Get token stats (for monitoring)
 */
export function getTokenStats() {
  const tokens = Array.from(tokenStore.values());
  const now = new Date();

  return {
    total: tokens.length,
    active: tokens.filter(t => !t.revoked && t.expiresAt > now).length,
    expired: tokens.filter(t => t.expiresAt <= now).length,
    revoked: tokens.filter(t => t.revoked).length
  };
}
