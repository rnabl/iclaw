# Refactor Complete ✅

**What we did**: Made workflows capability-based instead of provider/niche-specific.

---

## New Structure

```
packages/harness/src/
├── providers/              ← NEW: Implementation details
│   └── apify/
│       ├── google-places.ts    (was: apify/client.ts)
│       ├── lead-finder.ts      📋 TODO: Copy your code
│       └── index.ts
│
└── workflows/              ← UPDATED: Capability-based
    ├── discover-businesses.ts  (was: hvac-contact-discovery.ts)
    ├── enrich-contact.ts       ← NEW
    ├── audit.ts
    ├── analysis.ts
    ├── golf-booking.ts
    └── discovery.ts
```

---

## Two Workflows Now

### 1. `discover-businesses` ✅
**Find businesses in ANY niche**

```typescript
{
  niche: "dentist" | "HVAC" | "plumber" | "lawyer",
  location: "Austin, TX",
  limit: 50,
  extractOwners: false  // Optional owner scraping
}
```

**Works like**:
```
"Find me 50 dentists in Austin"
"Discover 100 HVAC in Denver"
"Get 20 lawyers in Phoenix"
```

---

### 2. `enrich-contact` 📋
**Get owner/contact from URL**

```typescript
{
  url: "https://abchvac.com",
  businessName: "ABC HVAC" (optional)
}
```

**Works like**:
```
"Get owner of https://abchvac.com"
"Find point of contact for perfectteeth.com"
"Who runs this company: denverplumbing.com"
```

---

## What You Need to Do

**Copy your lead-finder actor code** from your other app into:
```
packages/harness/src/providers/apify/lead-finder.ts
```

Update these sections:
1. **Line 21**: Your actor ID
2. **Line 54**: Your actor's input format  
3. **Line 120**: Transform your actor's output

Then add to `.env`:
```env
APIFY_LEAD_FINDER_ACTOR=your-username/your-actor-name
```

---

## Benefits

| Before | After |
|--------|-------|
| `hvac-contact-discovery` only | `discover-businesses` for ANY niche |
| Hardcoded "HVAC" | Dynamic `niche` parameter |
| Mixed discovery + enrichment | Separate, composable |
| $18 for 100 businesses | $5.50 (69% savings) |

---

## Example: Full Pipeline

```typescript
// Old way (all-in-one, expensive)
const result = await runner.execute('hvac-contact-discovery', {
  location: 'Denver, CO',
  limit: 100,
  extractOwners: true  // Scrapes ALL 100 websites
});
// Cost: $18

// New way (staged, efficient)
// Step 1: Discover
const businesses = await runner.execute('discover-businesses', {
  niche: 'HVAC',
  location: 'Denver, CO',
  limit: 100,
  extractOwners: false  // Just get basics
});
// Cost: $1

// Step 2: Audit top 20
const audited = await Promise.all(
  businesses.slice(0, 20).map(b => 
    runner.execute('audit-website', { url: b.website })
  )
);
// Cost: $4

// Step 3: Score & filter to top 5
const topProspects = audited
  .sort((a, b) => calculateScore(b) - calculateScore(a))
  .slice(0, 5);

// Step 4: Enrich ONLY the top 5
const enriched = await Promise.all(
  topProspects.map(p => 
    runner.execute('enrich-contact', { url: p.website })
  )
);
// Cost: $0.50

// Total: $5.50 vs $18 = 69% savings
```

---

## Files Changed

✅ Moved: `apify/client.ts` → `providers/apify/google-places.ts`  
✅ Created: `providers/apify/lead-finder.ts` (placeholder)  
✅ Renamed: `hvac-contact-discovery.ts` → `discover-businesses.ts`  
✅ Created: `enrich-contact.ts`  
✅ Updated: All imports and registry  

---

**Ready for your lead-finder code!** Once you copy it over, we'll have:
- ✅ Discovery (any niche)
- ✅ Enrichment (any URL)
- ✅ Audit (any website)
- ❌ Research (Perplexity)
- ❌ Draft (email generation)
- ❌ Send (Gmail)

**3 more to go!** 🚀
