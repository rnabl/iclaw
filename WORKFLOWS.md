# OneClaw Workflows Reference

Quick reference for all available workflows in the harness.

---

## Discovery Workflows

### `discover-businesses`
**Location**: `packages/harness/src/workflows/discovery.ts`  
**Purpose**: Vision-based agent that can navigate any website (OpenClaw style)

**Input**:
```typescript
{
  task: string;           // "Find golf tee times for 4 players"
  startUrl: string;       // "https://example.com/teetimes"
  maxIterations?: number; // Default 10
  extractData?: boolean;  // Default true
}
```

**Output**:
```typescript
{
  success: boolean;
  iterations: number;
  actions: string[];     // What the agent did
  data?: any;           // Extracted structured data
  screenshots?: string[]; // Base64 screenshots
}
```

**Required Secrets**: `GOOGLE_API_KEY` (for Gemini Vision)

---

### `hvac-contact-discovery`
**Location**: `packages/harness/src/workflows/hvac-contact-discovery.ts`  
**Purpose**: Find businesses with owner/decision-maker extraction

**Input**:
```typescript
{
  location: string;      // "Denver, CO"
  limit: number;         // 100
  extractOwners: boolean; // true (scrapes websites for owner names)
  method: "brave_website_scrape" | "apify_website_scrape" | "auto"
}
```

**Output**:
```typescript
{
  businesses: Array<{
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    rating?: number;
    reviewCount?: number;
    owner?: {
      name: string;
      title?: string;
      source: "website" | "inference" | "linkedin"
    }
  }>;
  stats: {
    total: number;
    withOwners: number;
    method: string;
    timeMs: number;
    cost: number;
  };
  toolsUsed: string[];
}
```

**Required Secrets**: 
- `BRAVE_API_KEY` (preferred) OR `APIFY_API_TOKEN`
- `GOOGLE_API_KEY` (for LLM owner extraction)

**Cost**: ~$0.15-0.20 per 100 businesses with owner extraction

---

## Audit Workflows

### `audit-website`
**Location**: `packages/harness/src/workflows/audit.ts`  
**Purpose**: Full SEO + AI visibility audit (calls your nabl Python service)

**Input**:
```typescript
{
  url: string;           // "https://example.com"
  businessName: string;  // "ABC HVAC"
  locations: Array<{
    city: string;
    state: string;
    serviceArea?: string;
  }>
}
```

**Output**:
```typescript
{
  score: number;         // Overall score 0-100
  citationsFound: number; // How many AI citations
  totalQueries: number;
  issues: Array<{
    type: "critical" | "warning" | "info";
    category: string;
    message: string;
    recommendation?: string;
  }>;
  categoryScores: {
    seo: number;
    aiVisibility: number;
    localPresence: number;
    technical: number;
  };
  htmlReport: string;    // Full HTML report
  analyzedAt: string;
}
```

**Required Secrets**: 
- `NABL_AUDIT_URL` (your Python service URL)
- `NABL_API_SECRET`
- Optionally: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `PERPLEXITY_API_KEY`

**Cost**: ~$0.20 per audit (DataForSEO + Perplexity)

---

### `analyze-business`
**Location**: `packages/harness/src/workflows/analysis.ts`  
**Purpose**: Quick intelligence scoring (lighter than full audit)

**Input**:
```typescript
{
  businessId: string;    // UUID from your DB
  type: "quick_intelligence" | "opportunity_analysis"
}
```

**Output**:
```typescript
{
  id: string;
  businessId: string;
  type: string;
  overallScore: number;  // 0-100
  dimensionScores: {
    websiteQuality: number;
    localSeo: number;
    adPresence: number;
    socialEngagement: number;
  };
  summary: string;
  insights: Array<{
    type: "opportunity" | "strength" | "weakness" | "recommendation";
    dimension: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  analyzedAt: string;
}
```

**Required Secrets**: Platform OpenAI key (for analysis LLM)

**Cost**: ~$0.05 per analysis

---

## Email Workflows (TODO)

### `perplexity-research` ❌ NOT BUILT YET
**Location**: TBD  
**Purpose**: Deep business research for email personalization

**Planned Input**:
```typescript
{
  businessName: string;
  location: string;
  website?: string;
  queryType: "general" | "competitive" | "news" | "pain_points"
}
```

**Planned Output**:
```typescript
{
  summary: string;       // 2-3 sentence overview
  keyFacts: string[];    // Bullet points
  recentNews: string[];  // Last 6 months
  competitors: string[]; // Main competitors
  painPoints: string[];  // Inferred challenges
  sources: string[];     // URLs
}
```

**Cost Estimate**: ~$0.05 per research query

---

### `draft-email` ❌ NOT BUILT YET
**Location**: TBD  
**Purpose**: Generate personalized cold email from template + data

**Planned Input**:
```typescript
{
  template: "ai_visibility" | "competitor" | "reviews" | "custom";
  prospect: {
    name: string;
    businessName: string;
    ownerName?: string;
    website?: string;
  };
  auditData: {
    seoScore: number;
    aiVisibilityScore: number;
    topIssue: string;
  };
  research?: {
    summary: string;
    keyFacts: string[];
  };
}
```

**Planned Output**:
```typescript
{
  subject: string;       // A/B tested variants
  body: string;          // Personalized email
  variables: object;     // What was personalized
  confidence: number;    // 0-100 quality score
}
```

**Cost Estimate**: ~$0.02 per email draft

---

### `send-gmail` ❌ NOT BUILT YET
**Location**: TBD  
**Purpose**: Send email via Gmail API with tracking

**Planned Input**:
```typescript
{
  to: string;
  subject: string;
  body: string;
  from?: string;         // Default from IDENTITY.md
  trackOpens?: boolean;  // Default true
  trackClicks?: boolean; // Default true
}
```

**Planned Output**:
```typescript
{
  messageId: string;     // Gmail message ID
  sent: boolean;
  sentAt: string;
  trackingId?: string;   // For opens/clicks
}
```

**Cost Estimate**: $0.00 (Gmail API is free)

---

## Golf Workflow (Example)

### `golf-booking`
**Location**: `packages/harness/src/workflows/golf-booking.ts`  
**Purpose**: Find and book golf tee times (vision-based agent)

**Input**:
```typescript
{
  location: string;      // "Denver, CO"
  date: string;          // "2026-02-26"
  timeRange: string;     // "9:00-10:00"
  partySize: number;     // 4
}
```

**Output**: Tee times with booking links

**Cost**: ~$0.30-0.50 (Gemini Vision API calls)

---

## How to Call Workflows

### From Agent (LLM)
```tool
{
  "tool": "harness.execute",
  "input": {
    "executor": "hvac-contact-discovery",
    "params": {
      "location": "Denver, CO",
      "limit": 10,
      "extractOwners": true
    }
  }
}
```

### From Code (TypeScript)
```typescript
import { runner } from './execution/runner';

const result = await runner.executeWorkflow('audit-website', {
  url: 'https://example.com',
  businessName: 'ABC HVAC',
  locations: [{ city: 'Denver', state: 'CO' }]
});
```

### From API (HTTP)
```bash
curl -X POST http://localhost:9000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "hvac-contact-discovery",
    "params": {
      "location": "Denver, CO",
      "limit": 10
    }
  }'
```

---

## Cost Summary

| Workflow | Typical Cost | Main Expense |
|----------|--------------|--------------|
| `discover-businesses` | $0.01/10 businesses | Brave/Apify API |
| `hvac-contact-discovery` | $0.15-0.20/100 | Website scraping + LLM |
| `audit-website` | $0.20/site | DataForSEO + Perplexity |
| `analyze-business` | $0.05/analysis | OpenAI LLM |
| `perplexity-research` | $0.05/query | Perplexity API |
| `draft-email` | $0.02/email | LLM generation |
| `send-gmail` | $0.00 | Gmail API (free) |

**Full outreach pipeline cost**: ~$0.50 per qualified lead

---

## Adding New Workflows

1. Create file in `packages/harness/src/workflows/`
2. Define Zod schemas for input/output
3. Implement handler function
4. Register with runner: `runner.registerWorkflow('id', handler)`
5. Export from `workflows/index.ts`
6. Document here

See existing workflows for examples.
