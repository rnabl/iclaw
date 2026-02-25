/**
 * Harness API Client for Sub-Agents
 * 
 * Communicates with the main harness to execute tools and get credentials.
 * Uses ephemeral tokens that expire after task completion.
 */

export interface DiscoveryResult {
  title: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviews?: number;
  placeId?: string;
}

export interface HarnessClient {
  discover(query: string, location: string, maxResults?: number): Promise<DiscoveryResult[]>;
  findCompetitor(businessName: string, query: string, location: string): Promise<string | null>;
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }>;
}

export function createHarnessClient(config: {
  harnessUrl: string;
  tenantId: string;
  ephemeralToken: string;
  timeout?: number;
}): HarnessClient {
  const { harnessUrl, tenantId, ephemeralToken, timeout = 120000 } = config;

  async function callHarness(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${harnessUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ephemeralToken}`,
          'X-Tenant-Id': tenantId
        },
        body: JSON.stringify({ 
          tool: toolName, 
          params,
          // Sub-agent context for audit
          context: {
            source: 'sub-agent',
            agentType: 'outreach'
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Harness error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  return {
    async discover(query: string, location: string, maxResults = 20): Promise<DiscoveryResult[]> {
      const result = await callHarness('discover-businesses', {
        query,
        location,
        maxResults
      }) as { businesses?: DiscoveryResult[] };
      
      return result.businesses || [];
    },

    async findCompetitor(businessName: string, query: string, location: string): Promise<string | null> {
      // This would call an AI search tool to find competitors
      // For now, we'll simulate with the discovery endpoint
      const results = await callHarness('discover-businesses', {
        query,
        location,
        maxResults: 5
      }) as { businesses?: DiscoveryResult[] };
      
      const businesses = results.businesses || [];
      // Find a business that's not the target
      const competitor = businesses.find(b => 
        b.title.toLowerCase() !== businessName.toLowerCase()
      );
      
      return competitor?.title || null;
    },

    async sendEmail(to: string, subject: string, body: string, fromName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
      try {
        const result = await callHarness('send-gmail', {
          to,
          subject,
          body,
          fromName
        }) as { success?: boolean; messageId?: string; error?: string };
        
        return {
          success: result.success ?? false,
          messageId: result.messageId,
          error: result.error
        };
      } catch (error) {
        console.error('[HarnessClient] sendEmail failed:', error);
        return {
          success: false,
          error: String(error)
        };
      }
    }
  };
}

// Standalone client for local testing
export function createMockClient(): HarnessClient {
  return {
    async discover(query: string, location: string): Promise<DiscoveryResult[]> {
      console.log(`[MOCK] Discovering: ${query} in ${location}`);
      // Simulate API delay
      await new Promise(r => setTimeout(r, 1000));
      
      return [
        { title: 'ABC HVAC Services', phone: '555-0101', city: location, reviews: 45, rating: 4.2 },
        { title: 'Cool Air Pros', phone: '555-0102', city: location, reviews: 120, rating: 4.8 },
        { title: 'Denver Climate Control', phone: '555-0103', city: location, reviews: 89, rating: 4.5 }
      ];
    },

    async findCompetitor(businessName: string): Promise<string | null> {
      console.log(`[MOCK] Finding competitor for: ${businessName}`);
      await new Promise(r => setTimeout(r, 500));
      return 'Cool Air Pros';
    },

    async sendEmail(to: string, subject: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
      console.log(`[MOCK] Sending email to: ${to}, subject: ${subject}`);
      await new Promise(r => setTimeout(r, 200));
      return { success: true, messageId: `mock-${Date.now()}` };
    }
  };
}
