# Harness Refactor: Provider-Based Architecture

**Date**: 2026-02-21  
**Goal**: Make workflows capability-based, not provider-specific

---

## What Changed

### Folder Structure

**BEFORE**:
```
packages/harness/src/
├── apify/
│   └── client.ts         # Apify Google Maps scraper
├── workflows/
│   ├── hvac-contact-discovery.ts  # HVAC-specific, hardcoded
│   └── ...
```

**AFTER**:
```
packages/harness/src/
├── providers/            # NEW: Provider implementations
│   ├── apify/
│   │   ├── google-places.ts   # Moved from apify/client.ts
│   │   ├── lead-finder.ts     # NEW: Placeholder for your actor
│   │   └── index.ts
│   └── index.ts
│
├── workflows/            # Capability-based naming
│   ├── discover-businesses.ts  # Renamed from hvac-contact-discovery.ts
│   ├── enrich-contact.ts       # NEW: Separate contact enrichment
│   └── ...
```

---

## Workflow Changes

### 1. `discover-businesses` (Renamed)

**Old**: `hvac-contact-discovery`  
**New**: `discover-businesses`  
**Breaking Change**: Added `niche` parameter

**Old API**:
```typescript
{
  location: "Denver, CO",
  limit: 100,
  extractOwners: true
}
```

**New API**:
```typescript
{
  niche: "HVAC",        // NEW: Required
  location: "Denver, CO",
  limit: 100,
  extractOwners: true
}
```

**Backward Compatibility**: Old workflow name still registered as alias.

---

### 2. `enrich-contact` (NEW)

**Purpose**: Given a URL, find owner contact info  
**Workflow ID**: `enrich-contact`

**API**:
```typescript
Input: {
  url: "https://abchvac.com",
  businessName: "ABC HVAC" (optional)
}

Output: {
  contact: {
    ownerName: "John Smith",
    ownerEmail: "john@abchvac.com",
    ownerPhone: "555-1234",
    ownerLinkedIn: "linkedin.com/in/johnsmith",
    source: "apify_lead_finder" | "website_scrape",
    confidence: 85
  },
  method: string,
  timeMs: number,
  cost: number
}
```

**Fallback Chain**: Apify lead-finder → Website scrape → null

---

## Registry Changes

**Added**:
- `BUSINESS_DISCOVERY_TOOL` - Generic discovery (replaces HVAC-specific)
- `ENRICH_CONTACT_TOOL` - Contact enrichment

**Deprecated** (kept for backward compat):
- `HVAC_CONTACT_TOOL` - Now points to `discover-businesses`

---

## Migration Guide

### For Existing Code

**Old way**:
```typescript
await runner.execute('hvac-contact-discovery', {
  location: 'Denver, CO',
  limit: 50,
  extractOwners: true
});
```

**New way**:
```typescript
await runner.execute('discover-businesses', {
  niche: 'HVAC',        // NEW
  location: 'Denver, CO',
  limit: 50,
  extractOwners: true
});
```

### Separate Contact Enrichment

**Before** (mixed in discovery):
```typescript
// Discovery returned owner info embedded
```

**After** (two steps):
```typescript
// Step 1: Discover businesses
const businesses = await runner.execute('discover-businesses', {
  niche: 'dentist',
  location: 'Austin, TX',
  limit: 50,
  extractOwners: false  // Don't extract yet
});

// Step 2: Enrich top prospects only
for (const business of topProspects) {
  const contact = await runner.execute('enrich-contact', {
    url: business.website
  });
}
```

**Why?** More flexible - you can discover 100 businesses but only enrich the top 10.

---

## What You Need to Do

### 1. Copy Your Lead-Finder Code

Replace the placeholder in:
```
packages/harness/src/providers/apify/lead-finder.ts
```

With your actual Apify lead-finder actor integration from your other app.

**Update these lines**:
```typescript
// Line 21: Set your actor ID
const APIFY_LEAD_FINDER_ACTOR = process.env.APIFY_LEAD_FINDER_ACTOR || 'YOUR_ACTUAL_ACTOR_ID';

// Line 54: Your actor's input format
const actorInput = {
  urls: [url],
  // YOUR ACTUAL PARAMS HERE
};

// Line 120: Transform your actor's output
return {
  url,
  ownerName: firstResult.YOUR_FIELD_NAME,
  ownerEmail: firstResult.YOUR_EMAIL_FIELD,
  // MAP YOUR ACTUAL FIELDS
};
```

### 2. Add to `.env`

```env
# Apify Actors
APIFY_API_TOKEN=apify_api_xxx
APIFY_LEAD_FINDER_ACTOR=your-username/your-lead-finder-actor
```

### 3. Test

```bash
# Test discovery
curl -X POST http://localhost:9000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "discover-businesses",
    "params": {
      "niche": "dentist",
      "location": "Austin, TX",
      "limit": 10
    }
  }'

# Test enrichment
curl -X POST http://localhost:9000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "enrich-contact",
    "params": {
      "url": "https://perfectteeth.com"
    }
  }'
```

---

## Benefits

✅ **Generic**: Works for any niche (dentists, plumbers, lawyers, etc.)  
✅ **Modular**: Discovery and enrichment are separate  
✅ **Efficient**: Only enrich top prospects, not all 100  
✅ **Clear**: Workflow names describe capabilities, not providers  
✅ **Extensible**: Easy to add new providers (Outscraper, Apollo, etc.)

---

## New Workflow Flow

```
Step 1: DISCOVER (broad)
└─ discover-businesses({ niche: "HVAC", location: "Denver", limit: 100 })
   └─ Returns: 100 businesses with basic info

Step 2: SCORE (filter)
└─ Rank by audit scores
   └─ Returns: Top 10 qualified prospects

Step 3: ENRICH (targeted)
└─ For each top 10:
   └─ enrich-contact({ url: business.website })
      └─ Returns: Owner name, email, phone, LinkedIn
```

**Cost savings**: 
- Old: $18 (100 businesses × $0.18 enrichment)
- New: $1.80 (10 top prospects × $0.18 enrichment)
- **Saved**: $16.20 per batch

---

## Files Changed

- ✅ Renamed: `hvac-contact-discovery.ts` → `discover-businesses.ts`
- ✅ Created: `enrich-contact.ts`
- ✅ Moved: `apify/client.ts` → `providers/apify/google-places.ts`
- ✅ Created: `providers/apify/lead-finder.ts` (placeholder)
- ✅ Created: `providers/apify/index.ts`
- ✅ Created: `providers/index.ts`
- ✅ Updated: `workflows/index.ts`
- ✅ Updated: `registry/index.ts`
- ✅ Updated: `registry/schemas.ts`
- ✅ Updated: `workflows/golf-booking.ts` (import path)
- ✅ Updated: `workflows/discover-businesses.ts` (import path)

---

## Next Steps

1. **Copy your lead-finder code** into `providers/apify/lead-finder.ts`
2. **Test both workflows** separately
3. **Update outreach PLAYBOOKS.md** to use new workflow names
4. **Build remaining workflows** (research, draft, send)
