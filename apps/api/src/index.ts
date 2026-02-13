// iClaw API Server
// Main entry point for the API that handles BlueBubbles webhooks and AI interactions

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { webhookHandler } from './routes/webhook';
import { healthHandler } from './routes/health';
import { stripeWebhookHandler } from './routes/stripe';
import { googleAuthHandler, googleCallbackHandler } from './routes/oauth';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.get('/', (c) => c.json({ name: 'iClaw API', version: '0.2.0', status: 'ok' }));
app.get('/health', healthHandler);

// BlueBubbles webhook - receives incoming iMessages
app.post('/webhook/bluebubbles', webhookHandler);

// Stripe webhook - handles subscription events
app.post('/webhook/stripe', stripeWebhookHandler);

// OAuth routes - user taps link in iMessage, authenticates in browser
app.get('/oauth/google', googleAuthHandler);
app.get('/oauth/google/callback', googleCallbackHandler);

// Export for different runtimes
export default app;

// Start server
const port = process.env.PORT || 3000;

console.log(`🚀 iClaw API starting on port ${port}`);

import('@hono/node-server').then(({ serve }) => {
  serve({
    fetch: app.fetch,
    port: Number(port),
  });
  console.log(`✅ Server running on port ${port}`);
});
