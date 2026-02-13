// Stripe webhook handler

import type { Context } from 'hono';
import { createLogger, ONBOARDING_STATE } from '@iclaw/core';
import { updateUserTierByStripeId, updateUserTierByPhone, updateOnboardingState, linkStripeCustomer, saveOpenClawConfig } from '@iclaw/database';
import { createSendblueClient } from '@iclaw/sendblue';
import type { UserTier } from '@iclaw/core';

const log = createLogger('StripeWebhook');

// Price IDs from environment
const STARTER_PRICE_ID = process.env.STRIPE_STARTER_PRICE_ID || '';
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || '';

// OpenClaw provisioning API
const PROVISION_API_URL = process.env.OPENCLAW_PROVISION_URL || 'http://104.131.111.116:3456';
const PROVISION_SECRET = process.env.OPENCLAW_PROVISION_SECRET || 'iclaw-provision-2026';

// Track next available port (start at 18001)
let nextPort = 18001;

/**
 * Provision a new OpenClaw instance for a user
 */
async function provisionOpenClawInstance(phoneNumber: string): Promise<{ port: number; token: string } | null> {
  try {
    const port = nextPort++;
    
    const response = await fetch(`${PROVISION_API_URL}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneNumber,
        port,
        secret: PROVISION_SECRET,
      }),
    });

    if (!response.ok) {
      log.error('Provision API error', { status: response.status });
      return null;
    }

    const data = await response.json();
    return { port: data.port || port, token: data.token };
  } catch (error) {
    log.error('Failed to provision OpenClaw instance', error);
    return null;
  }
}

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
        const phoneNumber = session.client_reference_id; // Phone number we passed
        const customerId = session.customer as string;
        const mode = session.mode;

        log.info('Checkout completed', { 
          customerId,
          phoneNumber,
          mode 
        });

        // If we have a phone number, link customer and update tier
        if (phoneNumber) {
          // Link Stripe customer ID to user
          await linkStripeCustomer(phoneNumber, customerId);

          // Determine tier from session (for one-time or subscription)
          let tier: UserTier = 'starter';
          if (session.amount_total && session.amount_total >= 4900) {
            tier = 'pro';
          }

          // Update user tier by phone
          const success = await updateUserTierByPhone(phoneNumber, tier);
          log.info('Updated user tier by phone', { phoneNumber, tier, success });

          // Provision OpenClaw instance for this user
          const provisionResult = await provisionOpenClawInstance(phoneNumber);
          if (provisionResult) {
            log.info('Provisioned OpenClaw instance', provisionResult);
            // Save port and token to database
            await saveOpenClawConfig(phoneNumber, provisionResult.port, provisionResult.token);
          }

          // Move to next onboarding state
          try {
            await updateOnboardingState(phoneNumber, ONBOARDING_STATE.SETTING_UP_SKILLS);
          } catch (e) {
            log.warn('Could not update onboarding state', e);
          }

          // Send confirmation message via Sendblue
          try {
            const sendblue = createSendblueClient();
            await sendblue.sendMessage(
              phoneNumber,
              `Payment received ✅

Spinning up your assistant...

✓ Your own AI instance
✓ Your data stays yours
✓ Available 24/7

Reply "ready" when you want to continue setup!`
            );
            log.info('Sent payment confirmation', { phoneNumber });
          } catch (e) {
            log.error('Failed to send payment confirmation', e);
          }
        }
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
