/**
 * Discover Businesses Tool
 * 
 * Simple wrapper around the discover-businesses workflow for sub-agent use.
 */

import { Tool } from '../registry';
import { runner } from '../execution';

export const discoverBusinessesTool: Tool = {
  name: 'discover_businesses',
  description: 'Discover businesses matching a query and location',
  parameters: {
    query: { type: 'string', required: true, description: 'Business type or niche (e.g., "HVAC", "Plumbing")' },
    location: { type: 'string', required: true, description: 'City and state (e.g., "Denver, Colorado")' },
    maxResults: { type: 'number', required: false, description: 'Maximum number of results (default: 20)' }
  },

  async execute(params, context) {
    const { query, location, maxResults = 20 } = params;
    const { tenantId } = context;

    if (!query || !location) {
      return { error: 'Missing required parameters: query, location' };
    }

    try {
      // Execute the workflow
      const job = await runner.execute('discover-businesses', {
        query,
        location,
        maxResults
      }, {
        tenantId,
        tier: 'free'
      });

      // Wait for completion (workflows execute synchronously in runner)
      if (job.status === 'completed' && job.output) {
        return {
          businesses: job.output.businesses || []
        };
      } else if (job.error) {
        return { error: job.error };
      } else {
        return { error: 'Workflow failed', status: job.status };
      }
    } catch (error) {
      return { error: String(error) };
    }
  }
};
