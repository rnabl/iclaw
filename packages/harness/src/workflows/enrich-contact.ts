/**
 * Contact Enrichment Workflow
 * 
 * Given a business URL or name, find owner/decision-maker contact information.
 * 
 * Multi-provider strategy (cheapest to most expensive):
 * 1. Perplexity AI - $0.005 (fast owner name extraction)
 * 2. DataForSEO SERP - $0.10 (rich SERP data)
 * 3. Apify LinkedIn - $0.15+ (full contact + company data)
 * 
 * Input:
 * - url: "https://abchvac.com" (required)
 * - businessName: "ABC HVAC" (optional, helps with context)
 * - method: "auto" | "perplexity" | "dataforseo" | "linkedin" (default: auto)
 * 
 * Output:
 * - owner: { name, title, email, phone, linkedin }
 * - contacts: Array of team members (if using LinkedIn)
 * - company: { size, industry, founded } (if using LinkedIn)
 * - source: "perplexity" | "dataforseo" | "linkedin" | "website_scrape"
 */

import type { StepContext } from '../execution/runner';
import { runner } from '../execution/runner';
import { z } from 'zod';
import { findContacts } from '../providers/apify/lead-finder';
import { searchBusinessOwner as perplexityOwnerSearch } from '../providers/perplexity/owner-search';
import { searchBusinessOwner as dataForSEOOwnerSearch } from '../providers/dataforseo/serp';

// =============================================================================
// SCHEMAS
// =============================================================================

const EnrichContactInput = z.object({
  url: z.string().url(),
  businessName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  method: z.enum(['auto', 'perplexity', 'dataforseo', 'linkedin']).default('auto'),
});

type EnrichContactInput = z.infer<typeof EnrichContactInput>;

interface ContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  seniorityLevel?: 'owner' | 'executive' | 'manager' | 'staff';
}

interface CompanyInfo {
  name?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  linkedinUrl?: string;
}

interface EnrichContactOutput extends Record<string, unknown> {
  url: string;
  businessName?: string;
  owner: ContactPerson | null;
  contacts: ContactPerson[];
  company: CompanyInfo | null;
  method: string;
  source: 'perplexity' | 'dataforseo' | 'linkedin' | 'website_scrape';
  timeMs: number;
  cost: number;
  fallbackUsed: boolean;
}

// =============================================================================
// ENRICHMENT METHODS (Cheapest to Most Expensive)
// =============================================================================

/**
 * Method 1: Perplexity AI - $0.005 per search
 * Fast owner name extraction from web research
 */
async function enrichViaPerplexity(
  ctx: StepContext,
  businessName: string,
  city?: string,
  state?: string
): Promise<{ owner: ContactPerson | null; sources: string[] } | null> {
  
  await ctx.log('info', `Searching Perplexity for ${businessName} owner`);
  
  try {
    const result = await perplexityOwnerSearch({ businessName, city, state });
    
    if (result.owners.length === 0) {
      return null;
    }
    
    const primary = result.owners[0];
    
    return {
      owner: {
        name: primary.name,
        title: primary.role || 'Owner',
        seniorityLevel: 'owner',
        linkedin: primary.linkedinUrl,
      },
      sources: result.sources,
    };
    
  } catch (error) {
    await ctx.log('warn', `Perplexity search failed: ${error}`);
    throw error;
  }
}

/**
 * Method 2: DataForSEO SERP - $0.10-0.15 per search
 * Rich SERP data (AI Overview, Featured Snippets, Knowledge Graph)
 */
async function enrichViaDataForSEO(
  ctx: StepContext,
  businessName: string,
  city?: string,
  state?: string
): Promise<{ owner: ContactPerson | null; sources: string[] } | null> {
  
  await ctx.log('info', `Searching DataForSEO SERP for ${businessName} owner`);
  
  try {
    const result = await dataForSEOOwnerSearch({ businessName, city, state });
    
    if (!result.ownerName) {
      return null;
    }
    
    return {
      owner: {
        name: result.ownerName,
        title: result.ownerRole || 'Owner',
        seniorityLevel: 'owner',
      },
      sources: result.allMentions.map(m => m.source),
    };
    
  } catch (error) {
    await ctx.log('warn', `DataForSEO search failed: ${error}`);
    throw error;
  }
}

/**
 * Method 3: Apify LinkedIn - $0.15+ per search
 * Full contact data with emails, company info, team list
 */
async function enrichViaLinkedIn(
  ctx: StepContext,
  url: string,
  businessName?: string
): Promise<{ owner: ContactPerson | null; contacts: ContactPerson[]; company: CompanyInfo | null } | null> {
  
  await ctx.log('info', `Enriching via Apify LinkedIn for ${url}`);
  
  try {
    const result = await findContacts({ url, businessName });
    
    if (!result) {
      return null;
    }
    
    return {
      owner: result.owner ? {
        name: result.owner.fullName || '',
        title: result.owner.jobTitle || 'Owner',
        email: result.owner.email || undefined,
        phone: result.owner.mobileNumber || undefined,
        linkedin: result.owner.linkedin || undefined,
        seniorityLevel: result.owner.seniorityLevel || 'owner',
      } : null,
      contacts: result.contacts.map(c => ({
        name: c.fullName || '',
        title: c.jobTitle || undefined,
        email: c.email || undefined,
        phone: c.mobileNumber || undefined,
        linkedin: c.linkedin || undefined,
        seniorityLevel: c.seniorityLevel || 'staff',
      })),
      company: result.company ? {
        name: result.company.name || undefined,
        website: result.company.website || undefined,
        industry: result.company.industry || undefined,
        companySize: result.company.companySize || undefined,
        foundedYear: result.company.foundedYear || undefined,
        linkedinUrl: result.company.linkedinUrl || undefined,
      } : null,
    };
    
  } catch (error) {
    await ctx.log('warn', `LinkedIn enrichment failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback: Extract contact from website directly (Cheerio + LLM)
 */
async function enrichViaWebsiteScrape(
  ctx: StepContext,
  url: string
): Promise<{ owner: ContactPerson | null } | null> {
  
  await ctx.log('info', 'Fallback: Scraping website for contact info');
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const html = await response.text();
    
    // Parse for contact info with regex patterns
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phonePattern = /\d{3}[-.]?\d{3}[-.]?\d{4}/;
    const namePattern = /(?:owner|founder|ceo|president)[:]\s*([A-Z][a-z]+ [A-Z][a-z]+)/i;
    
    const emailMatch = html.match(emailPattern);
    const phoneMatch = html.match(phonePattern);
    const nameMatch = html.match(namePattern);
    
    if (emailMatch || phoneMatch || nameMatch) {
      return {
        owner: {
          name: nameMatch?.[1] || 'Unknown',
          email: emailMatch?.[0],
          phone: phoneMatch?.[0],
        },
      };
    }
    
    return null;
    
  } catch (error) {
    await ctx.log('warn', `Website scrape failed: ${error}`);
    return null;
  }
}

// =============================================================================
// MAIN WORKFLOW HANDLER
// =============================================================================

async function enrichContactHandler(
  ctx: StepContext,
  input: Record<string, unknown>
): Promise<EnrichContactOutput> {
  const params = EnrichContactInput.parse(input);
  const { url, businessName } = params;
  
  const startTime = Date.now();
  
  await ctx.log('info', `Starting contact enrichment for ${url}`);
  
  let contact: ContactInfo | null = null;
  let method = 'unknown';
  let cost = 0;
  
  // ==========================================================================
  // STEP 1: Try Apify lead-finder first (if configured)
  // ==========================================================================
  const APIFY_LEAD_FINDER_ACTOR = process.env.APIFY_LEAD_FINDER_ACTOR;
  
  if (APIFY_LEAD_FINDER_ACTOR && APIFY_LEAD_FINDER_ACTOR !== 'YOUR_ACTOR_ID_HERE') {
    runner.updateStep(ctx.jobId, 1, 'Extracting via Apify lead-finder', 2);
    
    try {
      contact = await enrichViaApifyLeadFinder(ctx, url, businessName);
      method = 'apify_lead_finder';
      cost = 0.10; // Apify actor cost
      
      ctx.recordApiCall('apify', 'lead_finder', 1);
      
    } catch (error) {
      await ctx.log('warn', `Apify failed: ${error}, falling back to scraping`);
    }
  }
  
  // ==========================================================================
  // STEP 2: Fallback to website scraping
  // ==========================================================================
  if (!contact) {
    runner.updateStep(ctx.jobId, 2, 'Scraping website for contact', 2);
    
    try {
      contact = await enrichViaWebsiteScrape(ctx, url);
      method = 'website_scrape';
      cost = 0.02; // Just HTTP fetch + regex
      
    } catch (error) {
      await ctx.log('error', `Website scrape failed: ${error}`);
    }
  }
  
  const timeMs = Date.now() - startTime;
  
  await ctx.log('info', contact ? 'Contact enrichment successful' : 'No contact info found', {
    method,
    timeMs,
    cost,
  });
  
  return {
    url,
    businessName,
    contact,
    method,
    timeMs,
    cost,
  };
}

// =============================================================================
// REGISTER WORKFLOW
// =============================================================================

runner.registerWorkflow('enrich-contact', enrichContactHandler);

export { enrichContactHandler };
