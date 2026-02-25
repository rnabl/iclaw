# Testing State-Level Workflow

## Quick Start

1. **Choose your state and niche**:
   Edit `scripts/test-state-workflow.ps1`:
   ```powershell
   $state = "Texas"    # Any US state
   $niche = "Roofing"  # Any business niche
   $limit = 10         # Results per city
   ```

2. **Run the test**:
   ```powershell
   .\scripts\test-state-workflow.ps1
   ```

## What It Does

This tests the **Phase 2 Workflow Template System** you envisioned:

1. ✅ **Research Cities** - Finds major cities in the state (cached for 24h)
2. ✅ **Queue Discovery** - Breaks down into individual city searches
3. ✅ **Parallel Execution** - Runs up to 3 cities concurrently
4. ✅ **Ephemeral Tokens** - Each task gets a 3-minute token
5. ✅ **Result Caching** - Step outputs are saved
6. ✅ **Aggregation** - Deduplicates and combines results
7. ✅ **Summary Generation** - Creates markdown report

## Example Output

```
🚀 Testing State-Level Discovery Workflow
State: Texas
Niche: Roofing
Limit per city: 10

📤 Sending request to Harness...

✅ Workflow Complete!

═══════════════════════════════════════════════════════════
Execution ID: abc123xyz
Total Businesses: 87
Cities Searched: 10

Cities: Houston, San Antonio, Dallas, Austin, Fort Worth, ...
═══════════════════════════════════════════════════════════

## Roofing Businesses in Texas

**Found**: 87 businesses across 10 cities

**Top Cities**:
1. Houston: 23 businesses
2. Dallas: 18 businesses
3. Austin: 15 businesses
...

**Stats**:
- Average Rating: 4.3 ⭐
- With Website: 74 (85%)
- SEO Optimized: 12 (14%)
- Running Ads: 8 (9%)
- Has Booking: 5 (6%)
```

## States Supported

Currently hardcoded for testing:
- Colorado
- Texas
- California
- Florida
- New York

**Note**: For production, this will use LLM to research cities dynamically.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         State-Level Discovery Workflow           │
│  (packages/harness/src/workflows/templates/)    │
└─────────────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌────────┐      ┌──────────┐     ┌──────────┐
│ Cache  │      │ Queue    │     │ Executor │
│ System │      │ System   │     │ Engine   │
└────────┘      └──────────┘     └──────────┘
    │                 │                 │
    │                 │                 │
    ▼                 ▼                 ▼
┌──────────────────────────────────────────┐
│  Ephemeral Tokens (3-min TTL per task)  │
└──────────────────────────────────────────┘
```

## Security Features

- ✅ **Short-lived tokens** - 3 minutes per task
- ✅ **Isolated execution** - Each city search is independent
- ✅ **Limited blast radius** - Token leak affects only one task
- ✅ **Audit logging** - All secret access is logged
- ✅ **Result caching** - Reduces API calls

## Next Steps

1. **Test this workflow** - Try different states/niches
2. **Add more templates** - Build "outreach campaign", "24/7 agent"
3. **Intent matcher** - Let LLM map natural language to templates
4. **Enrich + Outreach** - Add contact enrichment and email generation steps

## Files Created

```
packages/harness/src/workflows/templates/
├── types.ts              # Workflow schema definitions
├── state-level-discovery.ts  # State discovery template
├── executor.ts           # Workflow execution engine
├── queue.ts              # Task queue with ephemeral tokens
└── cache.ts              # Result caching system

packages/harness/src/workflows/auth/
└── ephemeral-tokens.ts   # Short-lived token system

packages/harness/src/api/routes.ts
└── POST /workflows/state-discovery  # Test endpoint
```

## Monitoring

Watch the Harness logs to see:
- Cities being queued
- Tasks completing
- Results being aggregated
- Summary generation

```
[Workflow] Starting state-level discovery: Roofing in Texas
[Workflow] Step 1: Researching cities...
[Workflow] Found 10 cities to search
[Workflow] Step 2: Queuing discovery for 10 cities...
[Workflow] Queued: Houston (task: abc123)
[Workflow] Queued: Dallas (task: def456)
...
[Workflow] Step 3: Waiting for 10 tasks to complete...
[Workflow] Task completed: Houston (1/10)
[Workflow] Task completed: Dallas (2/10)
...
[Workflow] Step 4: Aggregating results...
[Workflow] Complete! Found 87 businesses
```

## Cost Tracking

Each workflow execution tracks:
- Number of cities searched
- API calls made
- Estimated cost per task
- Total workflow cost

This data will be used for SaaS pricing tiers.
