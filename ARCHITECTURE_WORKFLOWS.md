# Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  USER                                                        │
│  "Find me 50 dentists in Austin and get owner emails"       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT (Rust Daemon)                                        │
│  • Reads PLAYBOOKS.md                                       │
│  • Decides which workflows to call                          │
│  • Orchestrates multi-step pipeline                         │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  WORKFLOWS (Capability Layer)                               │
│  • discover-businesses  → Find businesses in ANY niche       │
│  • enrich-contact      → Get owner info from URL            │
│  • audit-website       → SEO + AI visibility score          │
│  • research-business   → Perplexity deep dive (TODO)        │
│  • draft-email         → Generate personalized email (TODO) │
│  • send-email          → Gmail API send (TODO)              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  PROVIDERS (Implementation Layer)                           │
│  • apify/google-places     → compass/crawler-google-places  │
│  • apify/lead-finder       → YOUR lead-finder actor         │
│  • perplexity              → Perplexity API (TODO)          │
│  • brave                   → Brave Search API               │
│  • gmail                   → Gmail API (TODO)               │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                          │
│  • Apify.com                                                │
│  • Perplexity.ai                                            │
│  • Brave Search                                             │
│  • Gmail                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Two Workflows = Two Capabilities

### Workflow 1: `discover-businesses`
**What it does**: Find businesses in ANY niche/location  
**Provider**: Apify Google Places (`compass/crawler-google-places`)

```typescript
Input: {
  niche: "dentist" | "HVAC" | "plumber" | "lawyer" | etc.
  location: "Austin, TX"
  limit: 50
  extractOwners: false  // Optional: scrape websites for owners
}

Output: {
  businesses: [
    { name, phone, website, address, rating, reviewCount },
    ...
  ],
  stats: { total, timeMs, cost }
}
```

**Example prompts**:
- "Find me 50 dentists in Austin"
- "Discover 100 HVAC companies in Denver"
- "Get 20 plumbers in Phoenix"

---

### Workflow 2: `enrich-contact`
**What it does**: Given a URL, extract owner contact info  
**Provider**: Apify Lead-Finder (YOUR custom actor)

```typescript
Input: {
  url: "https://abchvac.com"
  businessName: "ABC HVAC" (optional)
}

Output: {
  contact: {
    ownerName: "John Smith",
    ownerEmail: "john@abchvac.com",
    ownerPhone: "555-1234",
    ownerLinkedIn: "linkedin.com/in/johnsmith",
    source: "apify_lead_finder",
    confidence: 85
  },
  method: string,
  timeMs: number,
  cost: number
}
```

**Example prompts**:
- "Get me the owner of https://abchvac.com"
- "Find point of contact for perfectteeth.com"
- "Who runs Denver Plumbing?"

---

## Cost Optimization

### Old Approach (All-in-One)
```
discover-businesses (with extractOwners=true)
└─ Find 100 businesses + scrape all 100 websites
   └─ Cost: $18 (100 × $0.18)
```

### New Approach (Staged)
```
Step 1: discover-businesses (extractOwners=false)
└─ Find 100 businesses
   └─ Cost: $1 (just Apify search)

Step 2: audit-website (top 20)
└─ Score and rank
   └─ Cost: $4 (20 × $0.20)

Step 3: enrich-contact (top 5)
└─ Get owner info for qualified leads only
   └─ Cost: $0.50 (5 × $0.10)

Total: $5.50 vs $18 = 69% cost savings
```

---

## Provider Flexibility

Want to switch providers? Just update the provider file:

```typescript
// providers/apify/google-places.ts
export async function searchBusinesses(...) {
  // Call Apify
}

// Want to switch to Outscraper? Create:
// providers/outscraper/google-places.ts
export async function searchBusinesses(...) {
  // Call Outscraper
}

// Then update the import in discover-businesses.ts
// Workflow API stays the same!
```

---

## Backward Compatibility

**Old workflow names still work**:
```typescript
// These are equivalent:
runner.execute('hvac-contact-discovery', { location: 'Denver, CO', ... })
runner.execute('discover-businesses', { niche: 'HVAC', location: 'Denver, CO', ... })
```

**But new code should use**: `discover-businesses` + `enrich-contact`

---

## File Locations

```
packages/harness/src/
├── providers/
│   ├── apify/
│   │   ├── google-places.ts     ✅ Moved, works
│   │   ├── lead-finder.ts       📋 TODO: Copy your code
│   │   └── index.ts             ✅ Created
│   └── index.ts                 ✅ Created
│
├── workflows/
│   ├── discover-businesses.ts   ✅ Renamed, generic niche param
│   ├── enrich-contact.ts        ✅ Created, needs lead-finder
│   ├── audit.ts                 ✅ Unchanged
│   ├── analysis.ts              ✅ Unchanged
│   ├── golf-booking.ts          ✅ Updated imports
│   └── discovery.ts             ✅ Vision agent (unchanged)
│
└── registry/
    ├── schemas.ts               ✅ Added BUSINESS_DISCOVERY_TOOL + ENRICH_CONTACT_TOOL
    └── index.ts                 ✅ Registered both tools
```

---

## Ready to Use

**Working now**:
- ✅ `discover-businesses` - Generic discovery (any niche)
- ✅ `audit-website` - SEO + AI visibility
- ✅ `analyze-business` - Quick scoring

**Needs your code**:
- 📋 `enrich-contact` - Placeholder created, needs your lead-finder actor code
- ❌ `research-business` - Not built yet
- ❌ `draft-email` - Not built yet
- ❌ `send-email` - Not built yet

---

**Next: Copy your lead-finder actor code into `providers/apify/lead-finder.ts`** and we'll have full discovery + enrichment working! 🎯
