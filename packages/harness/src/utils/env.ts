/**
 * Environment Detection Utilities
 * 
 * Bulletproof detection that works in:
 * - Local development (localhost:9000)
 * - VPS production (oneclaw.chat)
 * - Docker containers
 * - Any custom deployment
 * 
 * Priority order:
 * 1. Explicit environment variable (ONECLAW_ENV, HARNESS_URL, etc.)
 * 2. NODE_ENV detection
 * 3. Smart defaults based on context
 */

export type Environment = 'development' | 'production' | 'test';

/**
 * Detect current environment with multiple fallback strategies
 */
export function getEnvironment(): Environment {
  // 1. Explicit override (highest priority)
  if (process.env.ONECLAW_ENV) {
    return process.env.ONECLAW_ENV as Environment;
  }
  
  // 2. Standard Node.js environment
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  
  // 3. Check for production indicators
  if (process.env.HARNESS_URL?.includes('oneclaw.chat')) {
    return 'production';
  }
  
  // 4. Check if running in Docker
  if (process.env.DOCKER_CONTAINER === 'true') {
    return 'production';
  }
  
  // 5. Default to development
  return 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Get the harness URL with smart fallbacks
 */
export function getHarnessUrl(): string {
  // 1. Explicit override
  if (process.env.HARNESS_URL) {
    return process.env.HARNESS_URL;
  }
  
  // 2. Environment-based default
  return isProduction() 
    ? 'https://oneclaw.chat' 
    : 'http://localhost:9000';
}

/**
 * Get OAuth redirect URI with smart fallbacks
 */
export function getOAuthRedirectUri(): string {
  // 1. Explicit override
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  
  // 2. Environment-based default
  return isProduction()
    ? 'https://oneclaw.chat/oauth/google/callback'
    : 'http://localhost:9000/oauth/google/callback';
}

/**
 * Get API base URL with smart fallbacks
 */
export function getApiBaseUrl(): string {
  // 1. Explicit override
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // 2. Use harness URL as default
  return getHarnessUrl();
}

/**
 * Log environment info at startup (for debugging)
 */
export function logEnvironmentInfo(): void {
  const env = getEnvironment();
  const harnessUrl = getHarnessUrl();
  const oauthRedirect = getOAuthRedirectUri();
  
  console.log('🔍 Environment Detection:');
  console.log(`   Environment:    ${env}`);
  console.log(`   HARNESS_URL:    ${harnessUrl}`);
  console.log(`   OAuth Redirect: ${oauthRedirect}`);
  console.log(`   NODE_ENV:       ${process.env.NODE_ENV || '(not set)'}`);
  
  // Warnings
  if (isProduction()) {
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: No TOKEN_ENCRYPTION_KEY set in production!');
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn('⚠️  WARNING: No GOOGLE_CLIENT_ID set in production!');
    }
  }
}

/**
 * Validate production configuration
 * Returns array of missing/invalid configs
 */
export function validateProductionConfig(): string[] {
  const issues: string[] = [];
  
  if (!isProduction()) {
    return issues; // Skip validation in dev
  }
  
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    issues.push('TOKEN_ENCRYPTION_KEY is required for production');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    issues.push('GOOGLE_CLIENT_ID is required for OAuth');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    issues.push('GOOGLE_CLIENT_SECRET is required for OAuth');
  }
  
  // Check for at least one LLM provider
  const hasLlm = process.env.ANTHROPIC_API_KEY || 
                 process.env.OPENAI_API_KEY || 
                 process.env.OPENROUTER_API_KEY ||
                 process.env.PERPLEXITY_API_KEY;
  
  if (!hasLlm) {
    issues.push('At least one LLM API key is required (ANTHROPIC, OPENAI, etc.)');
  }
  
  return issues;
}
