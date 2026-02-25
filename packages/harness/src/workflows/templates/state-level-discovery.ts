/**
 * State-Level Discovery Template
 * 
 * Find all businesses of a specific niche across an entire state.
 * Breaks down into city-by-city discovery with queued execution.
 * 
 * Example: "Find all HVAC businesses in Colorado"
 */

import { WorkflowTemplate } from './types';

export const STATE_LEVEL_DISCOVERY: WorkflowTemplate = {
  id: 'state-level-discovery',
  name: 'State-Level Business Discovery',
  description: 'Discover businesses across an entire state, city by city',
  version: '1.0.0',
  
  tags: [
    'discovery',
    'state',
    'multi-city',
    'leads',
    'prospecting'
  ],
  
  // Input parameters
  params: {
    niche: {
      type: 'string',
      required: true,
      description: 'Business type (e.g., "HVAC", "dentist", "roofing")',
      example: 'HVAC'
    },
    state: {
      type: 'string',
      required: true,
      description: 'State name (e.g., "Colorado", "Texas")',
      example: 'Colorado'
    },
    cities: {
      type: 'array',
      required: false,
      description: 'Optional: List of cities to search (will research if not provided)',
      example: ['Denver', 'Colorado Springs', 'Aurora']
    },
    limit: {
      type: 'number',
      required: false,
      default: 20,
      description: 'Max results per city'
    },
    filters: {
      type: 'object',
      required: false,
      description: 'Optional filters (e.g., { reviewCount: { $gt: 50 } })'
    }
  },
  
  steps: [
    // STEP 1: Research cities (only if not provided)
    {
      id: 'research-cities',
      tool: 'llm',
      description: 'Research major cities in the state',
      condition: {
        if: '!params.cities'  // Skip if cities already provided
      },
      input: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a geographic research assistant. Return ONLY a JSON array of city names, no other text.'
          },
          {
            role: 'user',
            content: 'List the top 15 major cities in {{params.state}} by population. Return as JSON array: ["City1", "City2", ...]'
          }
        ],
        response_format: { type: 'json_object' }
      },
      cache: true,
      cacheKey: 'cities_{{params.state}}',
      cacheTTL: 86400,  // 24 hours
      tokenTTL: 60,     // 1 minute (fast LLM call)
      output: 'cities',
      strategy: 'sync'
    },
    
    // STEP 2: Discover businesses (queued, city by city)
    {
      id: 'discover-businesses',
      tool: 'discover-businesses',
      description: 'Search for businesses in each city',
      params: '{{ params.cities || step.research-cities.output.cities }}',
      forEach: 'city',  // Loop over each city
      strategy: 'queue',
      maxConcurrency: 3,  // Run 3 cities at a time
      input: {
        niche: '{{params.niche}}',
        location: '{{item}}, {{params.state}}',
        limit: '{{params.limit || 20}}'
      },
      cache: true,
      cacheKey: 'discovery_{{params.niche}}_{{item}}_{{params.state}}',
      cacheTTL: 3600,  // 1 hour
      tokenTTL: 180,   // 3 minutes per city
      scopes: ['execute:discover-businesses'],
      output: 'businessesByCity',
      retryAttempts: 3,
      retryDelay: 10000
    },
    
    // STEP 3: Aggregate results
    {
      id: 'aggregate-results',
      tool: 'data-aggregator',
      description: 'Combine all city results',
      input: {
        data: '{{step.discover-businesses.output}}',
        operation: 'flatten',
        deduplicate: true,
        deduplicateBy: 'googlePlaceId'
      },
      cache: true,
      cacheKey: 'aggregated_{{params.niche}}_{{params.state}}',
      cacheTTL: 3600,
      tokenTTL: 60,
      output: 'allBusinesses',
      strategy: 'sync'
    },
    
    // STEP 4: Filter & qualify (optional)
    {
      id: 'filter-qualify',
      tool: 'data-filter',
      description: 'Filter businesses by criteria',
      condition: {
        if: 'params.filters'
      },
      input: {
        data: '{{step.aggregate-results.output.allBusinesses}}',
        filters: '{{params.filters}}'
      },
      cache: false,
      tokenTTL: 60,
      output: 'qualifiedBusinesses',
      strategy: 'sync'
    },
    
    // STEP 5: Generate summary
    {
      id: 'generate-summary',
      tool: 'data-summarizer',
      description: 'Create executive summary',
      input: {
        data: '{{step.filter-qualify.output || step.aggregate-results.output}}',
        format: 'markdown',
        includeStats: true,
        includeTopCities: true
      },
      cache: false,
      tokenTTL: 60,
      output: 'summary',
      strategy: 'sync'
    }
  ],
  
  estimatedDurationMs: 300000,  // ~5 minutes (15 cities × 20 seconds)
  estimatedCostUsd: 0.30,       // 15 cities × $0.02 per city
  
  requiresApproval: false
};

// Export for registration
export default STATE_LEVEL_DISCOVERY;
