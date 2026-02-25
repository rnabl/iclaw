/**
 * External Service Providers
 * 
 * This directory contains client wrappers for external services.
 * Workflows call these providers, not the other way around.
 * 
 * Structure:
 * - apify/          - Apify actors (Google Places, lead-finder)
 * - perplexity/     - Perplexity API (research, owner search)
 * - dataforseo/     - DataForSEO APIs (SERP, keyword data)
 * - brave/          - Brave Search API (web search)
 * - gmail/          - Gmail API (email sending)
 * - etc.
 * 
 * Each provider should export simple functions that workflows can call.
 */

export * as apify from './apify';
export * as perplexity from './perplexity';
export * as dataforseo from './dataforseo';
