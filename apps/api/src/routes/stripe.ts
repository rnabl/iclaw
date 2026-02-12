// Stripe webhook handler

import type { Context } from 'hono';
import { createLogger } from '@iclaw/core';
import { updateUserTierByStripeId } from '@iclaw/database';
import type { UserTier } from '@iclaw/core';

const log = createLogger('StripeWebhook');

// Price IDs from environment
const STARTER_PRICE_ID = process.env.STRIPE_STARTER_PRICE_ID || '';
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || '';

/**
 * Map price ID to tier
 */
function getTierFromPriceId(priceId: string): UserTier {
  if (priceId === PRO_PRICE_ID) return 'pro';
  if (priceId === STARTER_PRICE_ID) return 'starter';
  return 'none';
}

export async function stripeWebhookHandler(c: Context) {
  try {
    // Get the raw body for signature verification
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      log.warn('Missing Stripe signature');
      return c.json({ error: 'Missing signature' }, 400);
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error('STRIPE_WEBHOOK_SECRET not configured');
      return c.json({ error: 'Webhook not configured' }, 500);
    }

    // Parse the event
    // In production, you'd verify the signature with Stripe SDK
    // For now, we'll parse directly (add verification in production)
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      log.warn('Invalid JSON in webhook');
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    log.info('Received Stripe event', { type: event.type });

    // Handle subscription events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items?.data?.[0]?.price?.id;

        if (!priceId) {
          log.warn('No price ID in subscription');
          break;
        }

        // Only update if subscription is active
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const tier = getTierFromPriceId(priceId);
          const success = await updateUserTierByStripeId(customerId, tier);
          log.info('Updated user tier', { customerId, tier, success });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const success = await updateUserTierByStripeId(customerId, 'none');
        log.info('Subscription cancelled', { customerId, success });
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        log.info('Checkout completed', { 
          customerId: session.customer,
          mode: session.mode 
        });
        // Subscription events will handle tier updates
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        log.warn('Payment failed', { customerId: invoice.customer });
        // Could send a notification to user here
        break;
      }

      default:
        log.debug('Unhandled event type', { type: event.type });
    }

    return c.json({ received: true });
  } catch (error) {
    log.error('Stripe webhook error', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
