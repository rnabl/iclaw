/**
 * Outreach Sub-Agent
 * 
 * Autonomous agent that runs in a sidecar/microVM:
 * 1. Discovers businesses matching criteria
 * 2. Finds competitors that outrank them in AI search
 * 3. Generates personalized emails
 * 4. Sends emails (with rate limiting)
 * 5. Logs everything for main agent monitoring
 * 
 * Environment variables:
 * - HARNESS_URL: URL of main harness API
 * - TENANT_ID: Tenant identifier
 * - EPHEMERAL_TOKEN: Short-lived token for this run
 * - LOG_DIR: Directory for log files (shared volume)
 * - NICHE: Business niche to target (e.g., "HVAC")
 * - LOCATION: Target location (e.g., "Colorado")
 * - SENDER_NAME: Your name for email signature
 * - SENDER_EMAIL: Your email address
 * - DRY_RUN: If "true", don't actually send emails
 * - MAX_EMAILS: Maximum emails to send (default: 10)
 * - EMAIL_DELAY_MS: Delay between emails (default: 5000)
 */

import { nanoid } from 'nanoid';
import { SubAgentLogger } from './logger.js';
import { createHarnessClient, createMockClient, HarnessClient, DiscoveryResult } from './harness-client.js';
import { generateOutreachEmail, EmailContext } from './email-template.js';

interface OutreachConfig {
  niche: string;
  location: string;
  senderName: string;
  senderEmail: string;
  maxEmails: number;
  emailDelayMs: number;
  dryRun: boolean;
  minReviews: number;
  maxReviews: number;
}

function getConfig(): OutreachConfig {
  return {
    niche: process.env.NICHE || 'HVAC',
    location: process.env.LOCATION || 'Denver, Colorado',
    senderName: process.env.SENDER_NAME || 'Ryan',
    senderEmail: process.env.SENDER_EMAIL || 'ryan@example.com',
    maxEmails: parseInt(process.env.MAX_EMAILS || '10'),
    emailDelayMs: parseInt(process.env.EMAIL_DELAY_MS || '5000'),
    dryRun: process.env.DRY_RUN === 'true',
    minReviews: parseInt(process.env.MIN_REVIEWS || '50'),
    maxReviews: parseInt(process.env.MAX_REVIEWS || '300')
  };
}

function getHarnessClient(): HarnessClient {
  const harnessUrl = process.env.HARNESS_URL;
  const tenantId = process.env.TENANT_ID;
  const token = process.env.EPHEMERAL_TOKEN;

  console.log('[Agent] Harness config:', { 
    hasUrl: !!harnessUrl, 
    hasTenant: !!tenantId, 
    hasToken: !!token,
    url: harnessUrl 
  });

  if (harnessUrl && tenantId && token) {
    return createHarnessClient({ harnessUrl, tenantId, ephemeralToken: token });
  }

  // Use mock client for local testing
  console.log('⚠️ No harness credentials - using mock client');
  return createMockClient();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runOutreachWorkflow(): Promise<void> {
  const runId = nanoid(10);
  const logger = new SubAgentLogger('outreach', runId);
  const config = getConfig();
  const client = getHarnessClient();

  const stats = {
    discovered: 0,
    qualified: 0,
    emailed: 0,
    failed: 0
  };

  try {
    logger.workflowStarted({
      niche: config.niche,
      location: config.location,
      maxEmails: config.maxEmails,
      dryRun: config.dryRun,
      reviewRange: `${config.minReviews}-${config.maxReviews}`
    });

    // Step 1: Discover businesses
    logger.info('step_1_discovery', `Searching for ${config.niche} businesses in ${config.location}`);
    
    const businesses = await client.discover(
      config.niche,
      config.location,
      50 // Fetch more to filter
    );

    stats.discovered = businesses.length;
    logger.info('discovery_complete', `Found ${businesses.length} businesses`);

    // Step 2: Filter by review count
    const qualified = businesses.filter(b => {
      const reviews = b.reviews || 0;
      return reviews >= config.minReviews && reviews <= config.maxReviews;
    });

    stats.qualified = qualified.length;
    logger.info('filtering_complete', `${qualified.length}/${businesses.length} meet review criteria`, {
      minReviews: config.minReviews,
      maxReviews: config.maxReviews
    });

    // Step 3: Process each qualified business
    const toProcess = qualified.slice(0, config.maxEmails);
    
    for (let i = 0; i < toProcess.length; i++) {
      const business = toProcess[i];
      logger.businessDiscovered({ 
        name: business.title, 
        id: business.placeId || `${i}`,
        city: business.city 
      });

      try {
        // Find competitor
        logger.debug('finding_competitor', `Looking for competitor of ${business.title}`);
        const competitor = await client.findCompetitor(
          business.title,
          config.niche,
          config.location
        );

        if (!competitor) {
          logger.warn('no_competitor', `Could not find competitor for ${business.title}`);
          continue;
        }

        logger.competitorFound(business.title, competitor);

        // Generate email
        const emailCtx: EmailContext = {
          businessName: business.title,
          competitor,
          niche: config.niche,
          senderName: config.senderName
        };

        const email = generateOutreachEmail(emailCtx);
        
        // Determine recipient
        const recipient = business.phone 
          ? `${business.title}` // Would need email lookup
          : business.title;
        
        logger.emailGenerated(business.title, recipient);

        // Send or simulate
        if (config.dryRun) {
          logger.info('email_dry_run', `[DRY RUN] Would send to ${recipient}`, {
            subject: email.subject,
            preview: email.body.substring(0, 100) + '...'
          });
          stats.emailed++;
        } else {
          const result = await client.sendEmail(
            config.senderEmail, // Would be actual recipient
            email.subject,
            email.body
          );

          if (result.success) {
            logger.emailSent(business.title, recipient, result.messageId);
            stats.emailed++;
          } else {
            logger.emailFailed(business.title, recipient, 'Send failed');
            stats.failed++;
          }
        }

        // Rate limit
        if (i < toProcess.length - 1) {
          logger.debug('rate_limit', `Waiting ${config.emailDelayMs}ms before next...`);
          await sleep(config.emailDelayMs);
        }

      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('business_error', `Error processing ${business.title}: ${error}`);
        stats.failed++;
      }
    }

    // Complete
    logger.workflowCompleted({
      discovered: stats.discovered,
      emailed: stats.emailed,
      failed: stats.failed
    });

    console.log('\n📊 Final Stats:');
    console.log(`   Discovered: ${stats.discovered}`);
    console.log(`   Qualified: ${stats.qualified}`);
    console.log(`   Emailed: ${stats.emailed}`);
    console.log(`   Failed: ${stats.failed}`);

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.workflowFailed(error);
    process.exit(1);
  }
}

// Entry point
console.log('🚀 Outreach Sub-Agent Starting...');
console.log(`   Run ID: ${nanoid(10)}`);
console.log(`   Time: ${new Date().toISOString()}`);
console.log('');

runOutreachWorkflow()
  .then(() => {
    console.log('\n✅ Workflow completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Workflow failed:', err);
    process.exit(1);
  });
