/**
 * Simple Workflow Executor
 * 
 * Executes state-level-discovery template for testing.
 * This is a simplified version - will be expanded later.
 */

import { WorkflowTemplate, WorkflowExecution } from './types';
import { taskQueue } from './queue';
import { resultCache } from './cache';
import { runner } from '../../execution';
import { nanoid } from 'nanoid';
import { searchCities, getBestMatch } from '../../utils/location-search';

export class WorkflowExecutor {
  /**
   * Execute state-level discovery template
   */
  async executeStateLevelDiscovery(params: {
    niche: string;
    state: string;
    cities?: string[];
    limit?: number;
    tenantId?: string;
  }): Promise<any> {
    const {
      niche,
      state,
      cities,
      limit = 20,
      tenantId = 'default'
    } = params;

    const executionId = nanoid();
    console.log(`[Workflow] Starting state-level discovery: ${niche} in ${state}`);
    console.log(`[Workflow] Execution ID: ${executionId}`);

    // STEP 1: Get cities (use provided or discover major cities)
    let cityList: string[] = cities || [];
    
    if (!cityList.length) {
      console.log('[Workflow] Step 1: Researching cities...');
      const cacheKey = `cities_${state}`;
      
      // Check cache first
      const cached = await resultCache.get(cacheKey);
      if (cached) {
        console.log(`[Workflow] Using cached cities for ${state}`);
        cityList = cached;
      } else {
        // For now, hardcode major cities (will integrate LLM later)
        cityList = await this.researchCities(state);
        await resultCache.save(cacheKey, cityList, 86400); // 24 hours
      }
      
      console.log(`[Workflow] Found ${cityList.length} cities to search`);
    }

    // STEP 2: Queue discovery for each city
    console.log(`[Workflow] Step 2: Queuing discovery for ${cityList.length} cities...`);
    
    const taskIds: string[] = [];
    for (const city of cityList) {
      const taskId = await taskQueue.enqueue({
        executionId,
        stepId: 'discover-businesses',
        tool: 'discover-businesses',
        input: {
          niche,
          location: `${city}, ${state}`,
          limit
        },
        tenantId,
        tokenTTL: 180,  // 3 minutes
        maxAttempts: 2
      });
      
      taskIds.push(taskId);
      console.log(`[Workflow] Queued: ${city} (task: ${taskId})`);
    }

    // STEP 3: Wait for all tasks to complete
    console.log(`[Workflow] Step 3: Waiting for ${taskIds.length} tasks to complete...`);
    const results = await this.waitForTasks(taskIds);
    
    // STEP 4: Aggregate results
    console.log(`[Workflow] Step 4: Aggregating results...`);
    const allBusinesses = this.aggregateResults(results);
    
    console.log(`[Workflow] Complete! Found ${allBusinesses.length} businesses`);
    
    // STEP 5: Generate summary
    const summary = this.generateSummary(allBusinesses, niche, state, cityList);
    
    // STEP 6: Generate proactive suggestions
    const suggestions = this.generateSuggestions(allBusinesses, niche, state);
    
    return {
      executionId,
      niche,
      state,
      cities: cityList,
      totalBusinesses: allBusinesses.length,
      businesses: allBusinesses,
      summary,
      suggestions,
      taskResults: results
    };
  }

  /**
   * Research major cities in a state using fuzzy matching
   */
  private async researchCities(state: string): Promise<string[]> {
    // Use fuzzy matcher to get top cities by population for this state
    const cities = searchCities(state, 10);
    
    if (cities.length === 0) {
      console.warn(`[Workflow] No cities found for state: ${state}`);
      return [];
    }
    
    console.log(`[Workflow] Found ${cities.length} cities in ${state}:`, cities.map(c => c.city).join(', '));
    
    return cities.map(c => c.city);
  }

  /**
   * Wait for all tasks to complete using event-driven approach
   */
  private async waitForTasks(taskIds: string[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const maxWaitTime = 300000; // 5 minutes max
      const timeout = setTimeout(() => {
        cleanup();
        console.warn('[Workflow] Timeout waiting for tasks');
        resolve(results); // Return partial results on timeout
      }, maxWaitTime);

      // Listen for task completion events
      const onTaskCompleted = (event: any) => {
        if (!taskIds.includes(event.taskId)) return;
        
        // Avoid duplicates
        if (results.find(r => r.taskId === event.taskId)) return;
        
        results.push({
          taskId: event.taskId,
          output: event.output,
          city: event.task.input.location
        });
        
        console.log(`[Workflow] Task completed: ${event.task.input.location} (${results.length}/${taskIds.length})`);
        
        // Check if all done
        if (results.length >= taskIds.length) {
          cleanup();
          resolve(results);
        }
      };

      const onTaskFailed = (event: any) => {
        if (!taskIds.includes(event.taskId)) return;
        
        // Avoid duplicates
        if (results.find(r => r.taskId === event.taskId)) return;
        
        console.error(`[Workflow] Task failed: ${event.task.input.location} - ${event.error}`);
        results.push({
          taskId: event.taskId,
          error: event.error,
          city: event.task.input.location
        });
        
        // Check if all done (including failures)
        if (results.length >= taskIds.length) {
          cleanup();
          resolve(results);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        taskQueue.off('taskCompleted', onTaskCompleted);
        taskQueue.off('taskFailed', onTaskFailed);
      };

      // Register event listeners
      taskQueue.on('taskCompleted', onTaskCompleted);
      taskQueue.on('taskFailed', onTaskFailed);

      // Check if any tasks already completed before we started listening
      for (const taskId of taskIds) {
        const task = taskQueue.getTask(taskId);
        if (task) {
          if (task.status === 'completed') {
            onTaskCompleted({ taskId, output: task.output, task });
          } else if (task.status === 'failed') {
            onTaskFailed({ taskId, error: task.error, task });
          }
        }
      }
    });
  }

  /**
   * Aggregate results from all cities
   */
  private aggregateResults(results: any[]): any[] {
    const allBusinesses: any[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.error) continue;
      
      const businesses = result.output?.businesses || [];
      
      for (const business of businesses) {
        // Deduplicate by googlePlaceId
        if (!seen.has(business.googlePlaceId)) {
          seen.add(business.googlePlaceId);
          allBusinesses.push(business);
        }
      }
    }

    return allBusinesses;
  }

  /**
   * Generate summary
   */
  private generateSummary(businesses: any[], niche: string, state: string, cities: string[]): string {
    const withWebsite = businesses.filter(b => b.website).length;
    const seoOptimized = businesses.filter(b => b.signals?.seoOptimized).length;
    const withAds = businesses.filter(b => b.signals?.hasAds).length;
    const withBooking = businesses.filter(b => b.signals?.hasBooking).length;

    const avgRating = businesses.filter(b => b.rating).reduce((sum, b) => sum + b.rating, 0) / businesses.filter(b => b.rating).length;

    return `## ${niche} Businesses in ${state}

**Found**: ${businesses.length} businesses across ${cities.length} cities

**Top Cities**:
${this.getTopCities(businesses, cities).map((c, i) => `${i + 1}. ${c.city}: ${c.count} businesses`).join('\n')}

**Stats**:
- Average Rating: ${avgRating.toFixed(1)} ⭐
- With Website: ${withWebsite} (${((withWebsite / businesses.length) * 100).toFixed(0)}%)
- SEO Optimized: ${seoOptimized} (${((seoOptimized / businesses.length) * 100).toFixed(0)}%)
- Running Ads: ${withAds} (${((withAds / businesses.length) * 100).toFixed(0)}%)
- Has Booking: ${withBooking} (${((withBooking / businesses.length) * 100).toFixed(0)}%)

### Next Actions:
- Filter by review count (\`reviewCount > 50 && reviewCount < 300\`)
- Enrich with owner contact info
- Generate personalized outreach emails
`;
  }

  /**
   * Get top cities by business count (with normalization)
   */
  private getTopCities(businesses: any[], cities: string[]): { city: string; count: number }[] {
    const cityCounts: Record<string, number> = {};
    
    for (const business of businesses) {
      // Normalize city name using fuzzy matcher
      const rawCity = business.city || 'Unknown';
      const normalized = getBestMatch(rawCity);
      const cityName = normalized?.city || rawCity;
      
      cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
    }

    return Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Generate proactive suggestions for next steps
   */
  private generateSuggestions(businesses: any[], niche: string, state: string): {
    nextSteps: string[];
    quickActions: { label: string; command: string }[];
  } {
    const suggestions: string[] = [];
    const quickActions: { label: string; command: string }[] = [];

    // Analyze data quality
    const withWebsite = businesses.filter(b => b.website).length;
    const seoOptimized = businesses.filter(b => b.signals?.seoOptimized).length;
    const withAds = businesses.filter(b => b.signals?.hasAds).length;
    const avgReviews = businesses.reduce((sum, b) => sum + (b.reviewCount || 0), 0) / businesses.length;

    // Suggestion 1: Filter by quality
    if (businesses.length > 20) {
      suggestions.push(`💡 **Filter** by review count to find businesses most likely to buy (50-300 reviews sweet spot)`);
      quickActions.push({
        label: "Filter by reviews (50-300)",
        command: `Filter businesses with reviewCount > 50 && reviewCount < 300`
      });
    }

    // Suggestion 2: Enrich with contacts
    if (withWebsite > businesses.length * 0.5) {
      suggestions.push(`📧 **Enrich** these businesses with owner contact info for personalized outreach`);
      quickActions.push({
        label: "Find owner contacts",
        command: `Enrich contacts for ${niche} businesses in ${state}`
      });
    }

    // Suggestion 3: Target non-optimized businesses
    if (seoOptimized < businesses.length * 0.3) {
      suggestions.push(`🎯 **Target** the ${businesses.length - seoOptimized} businesses without SEO - they need your services most!`);
      quickActions.push({
        label: "Show non-SEO businesses",
        command: `Filter businesses where seoOptimized = false`
      });
    }

    // Suggestion 4: Generate outreach
    suggestions.push(`✉️ **Generate** personalized cold emails for each business based on their signals`);
    quickActions.push({
      label: "Draft outreach emails",
      command: `Generate personalized emails for ${niche} businesses`
    });

    // Suggestion 5: Schedule recurring
    suggestions.push(`⏰ **Schedule** this search to run weekly and automatically reach out to new ${niche} businesses`);
    quickActions.push({
      label: "Set up weekly automation",
      command: `Schedule: Find new ${niche} in ${state} every Monday at 9am`
    });

    // Suggestion 6: Expand to nearby states
    const nearbyStates = this.getNearbyStates(state);
    if (nearbyStates.length > 0) {
      suggestions.push(`🗺️ **Expand** to nearby states: ${nearbyStates.slice(0, 3).join(', ')} for more leads`);
    }

    return {
      nextSteps: suggestions,
      quickActions
    };
  }

  /**
   * Get nearby states for expansion suggestions
   */
  private getNearbyStates(state: string): string[] {
    const stateMap: Record<string, string[]> = {
      'Texas': ['Oklahoma', 'Louisiana', 'Arkansas', 'New Mexico'],
      'California': ['Nevada', 'Arizona', 'Oregon'],
      'Florida': ['Georgia', 'Alabama'],
      'New York': ['New Jersey', 'Pennsylvania', 'Connecticut'],
      'Colorado': ['Wyoming', 'Utah', 'New Mexico', 'Kansas'],
    };
    return stateMap[state] || [];
  }
}

// Singleton instance
export const workflowExecutor = new WorkflowExecutor();
