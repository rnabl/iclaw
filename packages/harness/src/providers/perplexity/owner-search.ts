/**
 * Perplexity AI - Business Owner Research
 * 
 * Uses Perplexity's sonar model to find business owner information.
 * 
 * Cost: ~$0.005 per search (10x cheaper than DataForSEO SERP)
 * Accuracy: High for local businesses with online presence
 * 
 * Based on your implementation from the audit tool.
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_BASE = 'https://api.perplexity.ai';

export interface OwnerInfo {
  name: string;
  role: string | null;
  source: string;
  linkedinUrl?: string;
}

export interface OwnerSearchResult {
  owners: OwnerInfo[];
  sources: string[];
  query: string;
}

/**
 * Search for business owner using Perplexity AI
 * 
 * This is 10x cheaper than DataForSEO while maintaining high accuracy.
 */
export async function searchBusinessOwner(params: {
  businessName: string;
  city?: string;
  state?: string;
}): Promise<OwnerSearchResult> {
  
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }
  
  const { businessName, city, state } = params;
  
  // Build location context if available
  const location = city && state ? `${city}, ${state}` : city || state || '';
  const locationContext = location ? ` in ${location}` : '';
  
  // Craft a precise query that encourages accurate results
  const query = `Who owns or founded ${businessName}${locationContext}? Please provide the full name and role of the owner, founder, or CEO.`;
  
  console.log(`[Perplexity] Searching for owner: ${businessName}${locationContext}`);
  
  try {
    const response = await fetch(`${PERPLEXITY_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. Extract owner/founder names accurately. Return structured data.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${error}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log(`[Perplexity] Response: ${content.substring(0, 200)}...`);
    
    // Parse owner info from response
    const owners = parseOwnerFromText(content);
    
    return {
      owners,
      sources: citations,
      query,
    };
    
  } catch (error) {
    console.error('[Perplexity] Search failed:', error);
    throw error;
  }
}

/**
 * Parse owner information from Perplexity response text
 */
function parseOwnerFromText(text: string): OwnerInfo[] {
  const owners: OwnerInfo[] = [];
  
  // Patterns for extracting owner info
  const patterns = [
    // "John Smith is the founder and CEO"
    /([A-Z][a-z]+ [A-Z][a-z]+) is the (owner|founder|ceo|president|co-founder)/gi,
    // "Founded by John Smith"
    /(?:founded|owned|started) by ([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    // "John Smith, Owner"
    /([A-Z][a-z]+ [A-Z][a-z]+),?\s+(owner|founder|ceo|president)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1];
      const role = match[2] || 'Owner';
      
      // Avoid duplicates
      if (!owners.find(o => o.name === name)) {
        owners.push({
          name,
          role: role.charAt(0).toUpperCase() + role.slice(1),
          source: 'perplexity-ai',
        });
      }
    }
  }
  
  return owners;
}
