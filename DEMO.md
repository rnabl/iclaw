# OneClaw Pipeline Demo

Complete end-to-end demonstration of the Discovery → Enrich → Audit workflow.

## What This Demonstrates

This pipeline showcases automated cold outreach research:

1. **Discovery** - Find businesses in a target niche + location
2. **Enrichment** - Extract owner/decision-maker contact info  
3. **Audit** - Generate AI visibility analysis + HTML report

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ OneClaw Rust Agent (Daemon)                                │
│  - Reads SOUL, IDENTITY, PLAYBOOKS from ~/.oneclaw/        │
│  - Calls TypeScript Harness for workflow execution         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ TypeScript Harness (Port 9000)                             │
│  - Workflow orchestration                                   │
│  - Secret injection                                         │
│  - Cost metering                                            │
│  - Provider abstraction                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┬──────────────┬──────────────┬───────────────┐
│ Apify        │ Perplexity   │ DataForSEO   │ nabl Python   │
│ (Discovery)  │ (Owners)     │ (SERP)       │ (Audit)       │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

## Prerequisites

### 1. Start the TypeScript Harness

```bash
cd packages/harness
npm install
npm run dev  # Starts on http://localhost:9000
```

### 2. Configure API Keys

Add to `.env.local`:

```bash
# Required for Discovery
APIFY_API_TOKEN=apify_api_xxxxx

# Required for Owner Enrichment (pick one)
PERPLEXITY_API_KEY=pplx-xxxxx         # Recommended ($0.005/search)
DATAFORSEO_LOGIN=your@email.com        # Fallback ($0.10/search)
DATAFORSEO_PASSWORD=your_password

# Optional - for full audit
NABL_AUDIT_URL=http://your-audit-service.com
NABL_API_SECRET=your_secret
```

### 3. Install Dependencies

```bash
npm install node-fetch  # For demo script
```

## Running the Demo

### Option A: Node.js Script (Recommended)

```bash
node scripts/demo-pipeline.js
```

**Expected Output:**

```
========================================
OneClaw Pipeline Demo
========================================

[STEP 1] Discovering med spas in Denver, CO...
[SUCCESS] Found 5 businesses
  {
    "sample": [
      {
        "name": "Glacial RX Med Spa",
        "phone": "(303) 555-0123",
        "website": "https://glacialrx.com",
        "rating": 4.8
      }
    ]
  }

[STEP 2] Enriching contact for: Glacial RX Med Spa
[SUCCESS] Contact enrichment complete
  {
    "ownerName": "Sarah Johnson",
    "ownerTitle": "Founder & CEO",
    "email": "sarah@glacialrx.com",
    "linkedin": "https://linkedin.com/in/sarah-johnson",
    "source": "perplexity-ai"
  }

[STEP 3] Running audit for: Glacial RX Med Spa
[SUCCESS] Audit complete
  {
    "score": 42,
    "citationsFound": 1,
    "totalQueries": 4,
    "categoryScores": {
      "seo": 65,
      "aiVisibility": 42,
      "localPresence": 58,
      "technical": 72
    },
    "issuesCount": 3
  }

========================================
Pipeline Complete! (8.3s)
========================================

Target Prospect:
  Name: Glacial RX Med Spa
  Website: https://glacialrx.com
  Phone: (303) 555-0123
  Rating: 4.8⭐ (127 reviews)

Owner/Contact:
  Name: Sarah Johnson
  Title: Founder & CEO
  Email: sarah@glacialrx.com
  LinkedIn: https://linkedin.com/in/sarah-johnson

Audit Results:
  Overall Score: 42/100
  AI Citations: 1/4 locations
  SEO Score: 65
  AI Visibility: 42

Next Steps:
  1. Draft personalized outreach email
  2. Send to approval queue
  3. Send email via Gmail API
  4. Schedule follow-up

✅ Demo complete!
```

### Option B: Direct API Calls (cURL)

#### 1. Discover Businesses

```bash
curl -X POST http://localhost:9000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "discover-businesses",
    "input": {
      "niche": "med spa",
      "location": "Denver, CO",
      "limit": 5,
      "extractOwners": false
    }
  }'
```

#### 2. Enrich Contact

```bash
curl -X POST http://localhost:9000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "enrich-contact",
    "input": {
      "url": "https://glacialrx.com",
      "businessName": "Glacial RX Med Spa"
    }
  }'
```

#### 3. Run Audit

```bash
curl -X POST http://localhost:9000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "audit-website",
    "input": {
      "url": "https://glacialrx.com",
      "businessName": "Glacial RX Med Spa",
      "locations": [
        { "city": "Denver", "state": "CO", "serviceArea": "25mi" }
      ]
    }
  }'
```

### Option C: Via Rust Agent (Full OneClaw)

```bash
# Start the Rust daemon
cd oneclaw-node
cargo run

# In another terminal, send a goal
curl -X POST http://localhost:9001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Find 5 med spas in Denver, enrich the first one with owner contact, and run an audit"
  }'
```

The agent will:
1. Read `~/.oneclaw/agents/outreach/PLAYBOOKS.md`
2. Decide which workflows to call
3. Execute discover → enrich → audit sequence
4. Return structured results

## Cost Breakdown

| Step | Provider | Cost |
|------|----------|------|
| Discovery (5 businesses) | Apify Google Places | $0.05 |
| Owner Enrichment | Perplexity AI | $0.005 |
| Audit (1 location, 4 queries) | DataForSEO + Perplexity | $0.08 |
| **Total** | | **$0.135** |

**For 100 prospects:** $13.50

## What's Next?

After this pipeline completes, you have:

- ✅ Business name, phone, website, reviews
- ✅ Owner name, email, LinkedIn
- ✅ AI visibility score + detailed audit

**Next workflows to build:**

1. `draft-email` - Generate personalized outreach using owner + audit data
2. `send-gmail` - Send email via Gmail API
3. `schedule-followup` - Add to follow-up queue

These are defined in `~/.oneclaw/agents/outreach/PLAYBOOKS.md` but not yet implemented.

## Troubleshooting

### "Harness not found" Error

Make sure the harness is running:

```bash
cd packages/harness
npm run dev
```

### "Apify token invalid" Error

Check your `.env.local`:

```bash
grep APIFY_API_TOKEN .env.local
```

Get a token at: https://console.apify.com/account/integrations

### "nabl audit service unavailable"

The audit workflow will use mock data if the Python service isn't running. To use real audits:

1. Deploy your nabl Python service
2. Set `NABL_AUDIT_URL` in `.env.local`
3. Set `NABL_API_SECRET`

## Architecture Notes

### Why Two Services?

- **TypeScript Harness** - Fast, event-driven, great for API integrations
- **Python nabl** - Your existing audit code with DataForSEO, Perplexity, Gemini

The Harness **wraps** your Python service, it doesn't replace it.

### Provider Abstraction

The `providers/` directory contains clients for external services:

```
providers/
├── apify/
│   ├── google-places.ts    # Business discovery
│   └── lead-finder.ts       # LinkedIn enrichment
├── perplexity/
│   └── owner-search.ts      # Owner research ($0.005/search)
└── dataforseo/
    └── serp.ts              # SERP data ($0.10/search)
```

Workflows call providers, not APIs directly. This makes it easy to:
- Swap providers (e.g., Apify → Outscraper)
- Add caching
- Mock for testing

### Workflow Registration

All workflows register with the runner:

```typescript
runner.registerWorkflow('discover-businesses', handler);
```

The Rust agent can call any registered workflow via the harness API.

## Demo Video Script

**[0:00]** "Let me show you OneClaw's automated outreach pipeline..."

**[0:05]** "Step 1: Discovery - We search for med spas in Denver using Apify"

**[0:15]** "Found 5 businesses with ratings, phone numbers, websites..."

**[0:20]** "Step 2: Enrichment - We extract the owner's contact info"

**[0:30]** "Got Sarah Johnson, Founder & CEO, with email and LinkedIn"

**[0:35]** "Step 3: Audit - We analyze their AI visibility"

**[0:45]** "Score: 42/100. Only cited in 1 out of 4 AI searches"

**[0:50]** "Total cost: $0.13. Time: 8 seconds."

**[0:55]** "Next: Draft personalized email and send."

**[1:00]** "That's the OneClaw pipeline. Discovery to audit in under 10 seconds."

---

Built with ❤️ by the OneClaw team
