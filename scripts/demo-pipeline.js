#!/usr/bin/env node
/**
 * OneClaw Pipeline Demo
 * 
 * Showcases the complete workflow:
 * 1. Discover businesses (Apify)
 * 2. Enrich contacts (LinkedIn + Perplexity)
 * 3. Audit website (nabl Python service)
 * 
 * Usage:
 *   node scripts/demo-pipeline.js
 */

const fetch = require('node-fetch');

const HARNESS_URL = process.env.HARNESS_URL || 'http://localhost:9000';

// ANSI colors for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(step, message, data) {
  console.log(`${colors.bright}${colors.cyan}[${step}]${colors.reset} ${message}`);
  if (data) {
    console.log(colors.yellow + JSON.stringify(data, null, 2) + colors.reset);
  }
}

async function callWorkflow(workflowName, input) {
  log('API', `Calling workflow: ${workflowName}`, input);
  
  const response = await fetch(`${HARNESS_URL}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow: workflowName,
      input,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Workflow failed: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

async function main() {
  console.log(`\n${colors.bright}${colors.blue}========================================`);
  console.log(`OneClaw Pipeline Demo`);
  console.log(`========================================${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // ==========================================================================
    // STEP 1: Discover Med Spas in Denver
    // ==========================================================================
    log('STEP 1', 'Discovering med spas in Denver, CO...');
    
    const discoveryResult = await callWorkflow('discover-businesses', {
      niche: 'med spa',
      location: 'Denver, CO',
      limit: 5,
      extractOwners: false, // We'll use separate enrichment workflow
    });
    
    const businesses = discoveryResult.businesses || [];
    log('SUCCESS', `Found ${businesses.length} businesses`, {
      sample: businesses.slice(0, 2).map(b => ({
        name: b.name,
        phone: b.phone,
        website: b.website,
        rating: b.rating,
      })),
    });
    
    if (businesses.length === 0) {
      log('ERROR', 'No businesses found. Check Apify configuration.');
      return;
    }
    
    // ==========================================================================
    // STEP 2: Enrich Contact for First Business
    // ==========================================================================
    const targetBusiness = businesses[0];
    
    if (!targetBusiness.website) {
      log('SKIP', 'First business has no website, skipping enrichment');
    } else {
      log('STEP 2', `Enriching contact for: ${targetBusiness.name}`);
      
      const enrichResult = await callWorkflow('enrich-contact', {
        url: targetBusiness.website,
        businessName: targetBusiness.name,
      });
      
      log('SUCCESS', 'Contact enrichment complete', {
        ownerName: enrichResult.ownerName,
        ownerTitle: enrichResult.ownerTitle,
        email: enrichResult.ownerEmail,
        linkedin: enrichResult.linkedIn,
        source: enrichResult.source,
      });
      
      // Add enriched data to business object
      targetBusiness.owner = {
        name: enrichResult.ownerName,
        title: enrichResult.ownerTitle,
        email: enrichResult.ownerEmail,
        linkedin: enrichResult.linkedIn,
      };
    }
    
    // ==========================================================================
    // STEP 3: Audit Website
    // ==========================================================================
    if (targetBusiness.website) {
      log('STEP 3', `Running audit for: ${targetBusiness.name}`);
      
      const auditResult = await callWorkflow('audit-website', {
        url: targetBusiness.website,
        businessName: targetBusiness.name,
        locations: [
          { city: 'Denver', state: 'CO', serviceArea: '25mi' },
        ],
      });
      
      log('SUCCESS', 'Audit complete', {
        score: auditResult.score,
        citationsFound: auditResult.citationsFound,
        totalQueries: auditResult.totalQueries,
        categoryScores: auditResult.categoryScores,
        issuesCount: auditResult.issues?.length || 0,
      });
      
      // Add audit data to business object
      targetBusiness.audit = {
        score: auditResult.score,
        citationsFound: auditResult.citationsFound,
        categoryScores: auditResult.categoryScores,
      };
    }
    
    // ==========================================================================
    // FINAL REPORT
    // ==========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n${colors.bright}${colors.green}========================================`);
    console.log(`Pipeline Complete! (${duration}s)`);
    console.log(`========================================${colors.reset}\n`);
    
    console.log(`${colors.bright}Target Prospect:${colors.reset}`);
    console.log(`  Name: ${targetBusiness.name}`);
    console.log(`  Website: ${targetBusiness.website || 'N/A'}`);
    console.log(`  Phone: ${targetBusiness.phone || 'N/A'}`);
    console.log(`  Rating: ${targetBusiness.rating || 'N/A'}⭐ (${targetBusiness.reviewCount || 0} reviews)`);
    
    if (targetBusiness.owner) {
      console.log(`\n${colors.bright}Owner/Contact:${colors.reset}`);
      console.log(`  Name: ${targetBusiness.owner.name || 'Unknown'}`);
      console.log(`  Title: ${targetBusiness.owner.title || 'N/A'}`);
      console.log(`  Email: ${targetBusiness.owner.email || 'Not found'}`);
      console.log(`  LinkedIn: ${targetBusiness.owner.linkedin || 'Not found'}`);
    }
    
    if (targetBusiness.audit) {
      console.log(`\n${colors.bright}Audit Results:${colors.reset}`);
      console.log(`  Overall Score: ${targetBusiness.audit.score}/100`);
      console.log(`  AI Citations: ${targetBusiness.audit.citationsFound}`);
      console.log(`  SEO Score: ${targetBusiness.audit.categoryScores?.seo || 'N/A'}`);
      console.log(`  AI Visibility: ${targetBusiness.audit.categoryScores?.aiVisibility || 'N/A'}`);
    }
    
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`  1. Draft personalized outreach email`);
    console.log(`  2. Send to approval queue`);
    console.log(`  3. Send email via Gmail API`);
    console.log(`  4. Schedule follow-up`);
    
    console.log(`\n${colors.green}✅ Demo complete!${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.bright}\x1b[31m[ERROR]${colors.reset} ${error.message}`);
    if (error.stack) {
      console.error(colors.yellow + error.stack + colors.reset);
    }
    process.exit(1);
  }
}

main();
