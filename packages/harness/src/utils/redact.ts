/**
 * Secret Redaction Utility
 * 
 * Sanitizes error messages and logs to prevent accidental secret leakage.
 */

/**
 * Patterns that indicate a secret (API keys, tokens, passwords, etc.)
 */
const SECRET_PATTERNS = [
  // API keys (various formats)
  /\b[A-Za-z0-9_-]{20,}\b/g,  // Generic long alphanumeric strings
  /sk_[a-zA-Z0-9]{20,}/g,      // Stripe-style keys (sk_live_xxx, sk_test_xxx)
  /pk_[a-zA-Z0-9]{20,}/g,      // Publishable keys
  /[a-zA-Z0-9_-]{32,}/g,       // 32+ char tokens
  
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9_-]+/gi,
  
  // Basic auth
  /Basic\s+[A-Za-z0-9+/=]+/gi,
  
  // JWT tokens (3 base64 parts separated by dots)
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  
  // AWS keys
  /AKIA[0-9A-Z]{16}/g,
  
  // Google API keys
  /AIza[0-9A-Za-z_-]{35}/g,
  
  // GitHub tokens
  /ghp_[A-Za-z0-9]{36}/g,
  /gho_[A-Za-z0-9]{36}/g,
  /ghu_[A-Za-z0-9]{36}/g,
  
  // OpenAI API keys
  /sk-[A-Za-z0-9]{48}/g,
  
  // Anthropic API keys
  /sk-ant-[A-Za-z0-9_-]{40,}/g,
  
  // Common secret prefixes in environment variables
  /[A-Z_]+API_KEY[=:]\s*['"]?[A-Za-z0-9_-]+['"]?/gi,
  /[A-Z_]+SECRET[=:]\s*['"]?[A-Za-z0-9_-]+['"]?/gi,
  /[A-Z_]+TOKEN[=:]\s*['"]?[A-Za-z0-9_-]+['"]?/gi,
  /[A-Z_]+PASSWORD[=:]\s*['"]?[A-Za-z0-9_-]+['"]?/gi,
];

/**
 * Redact secrets from a string
 */
export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let redacted = text;
  
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep first 4 chars visible for debugging (if long enough)
      if (match.length > 8) {
        return `${match.substring(0, 4)}...[REDACTED]`;
      }
      return '[REDACTED]';
    });
  }
  
  return redacted;
}

/**
 * Redact secrets from an error object
 */
export function redactError(error: Error | unknown): Error {
  if (error instanceof Error) {
    const redactedError = new Error(redactSecrets(error.message));
    redactedError.name = error.name;
    redactedError.stack = error.stack ? redactSecrets(error.stack) : undefined;
    return redactedError;
  }
  
  // If it's a string, redact it
  if (typeof error === 'string') {
    return new Error(redactSecrets(error));
  }
  
  // Otherwise, return as-is
  return new Error(String(error));
}

/**
 * Redact secrets from arbitrary data structures
 */
export function redactData(data: unknown): unknown {
  if (!data) return data;
  
  // Handle primitives
  if (typeof data === 'string') {
    return redactSecrets(data);
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(redactData);
  }
  
  // Handle objects
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if key suggests it's a secret
    const keyLower = key.toLowerCase();
    const isSensitiveKey = ['secret', 'password', 'token', 'key', 'auth', 'credential'].some(
      (term) => keyLower.includes(term)
    );
    
    if (isSensitiveKey && typeof value === 'string') {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redactData(value);
    } else if (typeof value === 'string') {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Safe JSON stringify with secret redaction
 */
export function safeStringify(data: unknown, space?: number): string {
  try {
    const redacted = redactData(data);
    return JSON.stringify(redacted, null, space);
  } catch (error) {
    return '[Error stringifying data]';
  }
}
