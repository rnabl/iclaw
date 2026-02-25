/**
 * Location Search with Fuzzy Matching
 * 
 * Smart city/state search with typo tolerance and normalization.
 * Used across all location-based workflows for input validation.
 */

import { US_CITIES, type City, getLocationString, getLocationWithMarketSize } from './cities';

// Simple Levenshtein distance for typo tolerance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Common misspellings and corrections
const STATE_CORRECTIONS: Record<string, string> = {
  // Common mistakes
  'mi': 'WI', // Michigan vs Wisconsin confusion
  'mich': 'MI',
  'wisc': 'WI',
  'wis': 'WI',
  'calif': 'CA',
  'cali': 'CA',
  'tx': 'TX',
  'tex': 'TX',
  'ny': 'NY',
  'fl': 'FL',
  'fla': 'FL',
  'pa': 'PA',
  'penn': 'PA',
  'oh': 'OH',
  'il': 'IL',
  'ill': 'IL',
};

// Normalize search input
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/[.,]/g, '');
}

// Parse location query (handles various formats)
export function parseLocationQuery(query: string): {
  cityQuery: string;
  stateQuery?: string;
} {
  const normalized = normalizeQuery(query);
  
  // Check if it's a state code or state name first (single word)
  if (normalized.length <= 2 || STATE_CORRECTIONS[normalized] || normalized.match(/^[a-z]{2}$/)) {
    const stateCode = STATE_CORRECTIONS[normalized] || normalized.toUpperCase();
    return { cityQuery: '', stateQuery: stateCode };
  }
  
  // Check if it's a full state name
  const stateFullMatch = US_CITIES.find(c => c.state.toLowerCase() === normalized);
  if (stateFullMatch) {
    return { cityQuery: '', stateQuery: stateFullMatch.stateCode };
  }
  
  // Try to split by comma or space
  const parts = normalized.split(/,|\s+/).filter(Boolean);
  
  if (parts.length === 1) {
    return { cityQuery: parts[0] };
  }
  
  // Last part is likely the state
  const stateQuery = parts[parts.length - 1];
  const cityQuery = parts.slice(0, -1).join(' ');
  
  // Apply state corrections
  const correctedState = STATE_CORRECTIONS[stateQuery] || stateQuery.toUpperCase();
  
  return {
    cityQuery,
    stateQuery: correctedState,
  };
}

// Search cities with fuzzy matching
export function searchCities(query: string, limit: number = 10): City[] {
  if (!query || query.trim().length < 2) {
    // Return top 10 cities by population if no query
    return US_CITIES.slice(0, limit);
  }
  
  const { cityQuery, stateQuery } = parseLocationQuery(query);
  const normalizedCity = cityQuery.toLowerCase();
  
  // Check if this is a state-only search
  const isStateOnlySearch = !cityQuery && stateQuery;
  
  if (isStateOnlySearch) {
    // Return all cities for this state, sorted by population
    return US_CITIES
      .filter((city) => {
        const stateLower = city.stateCode.toLowerCase();
        const stateFullLower = city.state.toLowerCase();
        const stateQueryLower = stateQuery!.toLowerCase();
        return (
          stateLower === stateQueryLower ||
          stateFullLower === stateQueryLower ||
          stateFullLower.startsWith(stateQueryLower) ||
          stateLower.startsWith(stateQueryLower)
        );
      })
      .sort((a, b) => b.population - a.population)
      .slice(0, limit);
  }
  
  // Score each city
  const scored = US_CITIES.map((city) => {
    const cityLower = city.city.toLowerCase();
    const stateLower = city.stateCode.toLowerCase();
    const stateFullLower = city.state.toLowerCase();
    
    let score = 0;
    
    // Exact match = highest score
    if (cityLower === normalizedCity) {
      score += 1000;
    }
    // Starts with = high score
    else if (cityLower.startsWith(normalizedCity)) {
      score += 500;
    }
    // Contains = medium score
    else if (cityLower.includes(normalizedCity)) {
      score += 250;
    }
    // Fuzzy match (typo tolerance)
    else {
      const distance = levenshteinDistance(normalizedCity, cityLower);
      // Allow up to 2 character differences
      if (distance <= 2) {
        score += 100 - (distance * 25);
      }
    }
    
    // State matching bonus
    if (stateQuery) {
      const stateQueryLower = stateQuery.toLowerCase();
      if (stateLower === stateQueryLower || stateFullLower === stateQueryLower) {
        score += 200;
      } else if (stateLower.startsWith(stateQueryLower) || stateFullLower.startsWith(stateQueryLower)) {
        score += 50;
      }
    }
    
    // Population bonus (prefer larger cities for ambiguous matches)
    score += Math.log10(city.population) * 5;
    
    return { city, score };
  });
  
  // Filter out zero scores and sort
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.city);
}

// Get best match for a location string
export function getBestMatch(query: string): City | null {
  const results = searchCities(query, 1);
  return results.length > 0 ? results[0] : null;
}

// Validate and correct location
export function validateLocation(query: string): {
  isValid: boolean;
  correctedCity?: City;
  suggestions?: City[];
} {
  const parsed = parseLocationQuery(query);
  
  // Try exact match first
  const exactMatch = US_CITIES.find(
    (city) =>
      city.city.toLowerCase() === parsed.cityQuery.toLowerCase() &&
      (!parsed.stateQuery || 
       city.stateCode === parsed.stateQuery || 
       city.state.toLowerCase() === parsed.stateQuery.toLowerCase())
  );
  
  if (exactMatch) {
    return { isValid: true, correctedCity: exactMatch };
  }
  
  // Get fuzzy matches
  const suggestions = searchCities(query, 5);
  
  if (suggestions.length > 0) {
    return {
      isValid: false,
      correctedCity: suggestions[0], // Best guess
      suggestions,
    };
  }
  
  return { isValid: false };
}
