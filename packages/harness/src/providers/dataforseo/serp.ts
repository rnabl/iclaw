/**
 * DataForSEO - SERP API Integration
 * 
 * Provides rich Google search results including:
 * - AI Overview (Google's AI-generated summaries)
 * - Featured Snippets
 * - Knowledge Graphs
 * - Organic Results
 * - People Also Ask
 * 
 * Cost: ~$0.05-0.15 per search (depending on depth)
 * Use Perplexity as a cheaper alternative for simple owner searches.
 * 
 * Based on your implementation from the audit tool.
 */

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DATAFORSEO_API_BASE = 'https://api.dataforseo.com/v3';

export interface SERPItem {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  position?: string;
  title?: string;
  description?: string;
  url?: string;
  domain?: string;
  // Featured snippet specific
  featured_title?: string;
  // Knowledge graph specific
  founder?: string;
  ceo?: string;
  headquarters?: string;
  // AI Overview specific
  text?: string;
  sources?: Array<{ title: string; url: string }>;
}

export interface SERPSearchResult {
  success: boolean;
  query: string;
  totalResults: number;
  items: SERPItem[];
  aiOverview?: SERPItem;
  featuredSnippet?: SERPItem;
  knowledgeGraph?: SERPItem;
  organicResults: SERPItem[];
  error?: string;
}

/**
 * Search Google SERP via DataForSEO
 */
export async function searchGoogle(params: {
  query: string;
  locationCode?: number; // 2840 = United States
  depth?: number; // 10, 20, 50, 100
}): Promise<SERPSearchResult> {
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO credentials not configured');
  }
  
  const { query, locationCode = 2840, depth = 20 } = params;
  
  console.log(`[DataForSEO] Searching: ${query} (depth: ${depth})`);
  
  try {
    // Create Basic Auth header
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
    
    // Make SERP API request
    const response = await fetch(`${DATAFORSEO_API_BASE}/serp/google/organic/live/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: query,
        location_code: locationCode,
        language_code: 'en',
        device: 'desktop',
        os: 'windows',
        depth,
      }]),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DataForSEO API error: ${error}`);
    }
    
    const data = await response.json();
    const items: SERPItem[] = data.tasks?.[0]?.result?.[0]?.items || [];
    const totalResults = data.tasks?.[0]?.result?.[0]?.items_count || 0;
    
    console.log(`[DataForSEO] Got ${items.length} SERP items`);
    
    // Parse special SERP features
    const aiOverview = items.find(item => item.type === 'ai_overview' || item.type === 'ai_snippet');
    const featuredSnippet = items.find(item => item.type === 'featured_snippet');
    const knowledgeGraph = items.find(item => item.type === 'knowledge_graph');
    const organicResults = items.filter(item => item.type === 'organic');
    
    return {
      success: true,
      query,
      totalResults,
      items,
      aiOverview,
      featuredSnippet,
      knowledgeGraph,
      organicResults,
    };
    
  } catch (error) {
    console.error('[DataForSEO] Search failed:', error);
    return {
      success: false,
      query,
      totalResults: 0,
      items: [],
      organicResults: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for business owner specifically using AI Overview + SERP features
 */
export async function searchBusinessOwner(params: {
  businessName: string;
  city?: string;
  state?: string;
}): Promise<{
  ownerName: string | null;
  ownerRole: string | null;
  source: string | null;
  allMentions: Array<{ name: string; role: string; source: string }>;
}> {
  
  const { businessName, city, state } = params;
  
  const location = city && state ? `${city}, ${state}` : city || state || '';
  const locationContext = location ? ` in ${location}` : '';
  const query = `who owns ${businessName}${locationContext}`;
  
  const serpResult = await searchGoogle({ query, depth: 20 });
  
  if (!serpResult.success) {
    return {
      ownerName: null,
      ownerRole: null,
      source: null,
      allMentions: [],
    };
  }
  
  // Extract owner info from SERP features
  const mentions: Array<{ name: string; role: string; source: string }> = [];
  
  // Check AI Overview first (highest quality)
  if (serpResult.aiOverview) {
    const text = serpResult.aiOverview.text || serpResult.aiOverview.description || '';
    const ownerMatches = extractOwnerFromText(text);
    for (const match of ownerMatches) {
      mentions.push({ ...match, source: 'ai_overview' });
    }
  }
  
  // Check Featured Snippet
  if (serpResult.featuredSnippet) {
    const text = serpResult.featuredSnippet.description || '';
    const ownerMatches = extractOwnerFromText(text);
    for (const match of ownerMatches) {
      mentions.push({ ...match, source: 'featured_snippet' });
    }
  }
  
  // Check Knowledge Graph
  if (serpResult.knowledgeGraph) {
    if (serpResult.knowledgeGraph.founder) {
      mentions.push({
        name: serpResult.knowledgeGraph.founder,
        role: 'Founder',
        source: 'knowledge_graph',
      });
    }
    if (serpResult.knowledgeGraph.ceo) {
      mentions.push({
        name: serpResult.knowledgeGraph.ceo,
        role: 'CEO',
        source: 'knowledge_graph',
      });
    }
  }
  
  // Check organic results
  for (const item of serpResult.organicResults) {
    const snippet = item.description || '';
    const ownerMatches = extractOwnerFromText(snippet);
    for (const match of ownerMatches) {
      const isLinkedIn = item.url?.includes('linkedin.com');
      mentions.push({
        ...match,
        source: isLinkedIn ? 'linkedin' : 'organic_result',
      });
    }
  }
  
  // Deduplicate and return highest confidence match
  const uniqueMentions = deduplicateOwners(mentions);
  
  if (uniqueMentions.length === 0) {
    return {
      ownerName: null,
      ownerRole: null,
      source: null,
      allMentions: [],
    };
  }
  
  const primary = uniqueMentions[0];
  
  return {
    ownerName: primary.name,
    ownerRole: primary.role,
    source: primary.source,
    allMentions: uniqueMentions,
  };
}

function extractOwnerFromText(text: string): Array<{ name: string; role: string }> {
  const matches: Array<{ name: string; role: string }> = [];
  
  const patterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(?:the\s+)?(?:an?\s+)?(owner|founder|ceo|president|co-founder)/gi,
    /(?:founded|owned|started)\s+by\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(Owner|Founder|CEO|President)/g,
    /(Owner|Founder|CEO|President):\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
  ];
  
  for (const pattern of patterns) {
    const results = text.matchAll(pattern);
    for (const match of results) {
      let name: string;
      let role: string;
      
      if (match[2] && /[A-Z]/.test(match[2][0])) {
        role = match[1];
        name = match[2];
      } else {
        name = match[1];
        role = match[2] || 'Owner';
      }
      
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length >= 2 && nameParts.length <= 3) {
        matches.push({ name: name.trim(), role: role.trim() });
      }
    }
  }
  
  return matches;
}

function deduplicateOwners(owners: Array<{ name: string; role: string; source: string }>): Array<{ name: string; role: string; source: string }> {
  const sourceConfidence: Record<string, number> = {
    'knowledge_graph': 5,
    'linkedin': 4,
    'ai_overview': 3,
    'featured_snippet': 2,
    'organic_result': 1,
  };
  
  const uniqueOwners = new Map<string, { name: string; role: string; source: string }>();
  
  for (const owner of owners) {
    const existing = uniqueOwners.get(owner.name);
    const existingConfidence = existing ? (sourceConfidence[existing.source] || 0) : 0;
    const newConfidence = sourceConfidence[owner.source] || 0;
    
    if (!existing || newConfidence > existingConfidence) {
      uniqueOwners.set(owner.name, owner);
    }
  }
  
  return Array.from(uniqueOwners.values());
}
