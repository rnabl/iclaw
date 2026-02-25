# OneClaw Conversational Agent Status

## Your Goal
```
You: "Find me 100 HVAC clients in Denver"
Agent: "Found 100 HVAC businesses. Analyzing..."
Agent: "Top 10 sorted by conversion potential"

You: "Find the owners"
Agent: "Found 8 owners with contact info"

You: "Draft emails"
Agent: "Emails drafted in /outreach/drafts/"

You: "Schedule for tomorrow 9 AM"
Agent: "8 emails scheduled for Feb 19, 9 AM MT"
```

## What's Working ✅

### 1. Infrastructure
- ✅ Rust daemon with chat interface
- ✅ Agent OS loading SOUL/PLAYBOOKS from `~/.oneclaw/agents/outreach/`
- ✅ Harness API with workflow execution
- ✅ `/tools` endpoint with JSON Schema export

### 2. Workflows
- ✅ `discover-businesses` - Apify Google Places
- ✅ `enrich-contact` - Perplexity + LinkedIn
- ✅ `audit-website` - calls your Python service

### 3. Providers
- ✅ Apify (discovery + leads)
- ✅ Perplexity (owner search, $0.005)
- ✅ DataForSEO (SERP fallback, $0.10)

### 4. Tool Calling
- ✅ Daemon parses tool calls from LLM
- ✅ Daemon executes via `harness.execute`
- ✅ Three formats supported: Anthropic, Minimax, bracket markers

## What's Missing ❌

### 1. LLM Tool Registration
**Current:** Daemon doesn't fetch tools from harness
**Need:** On startup, `GET /tools` and pass to LLM

**File:** `oneclaw-node/src/executor.rs` (LlmExecutor)
**Change:**
```rust
// Before LLM call:
let tools = fetch_harness_tools(harness_url)?;
body["tools"] = json!(tools);  // Add to LLM request
```

### 2. Structured Output (JSON Schema)
**Current:** LLM returns tool calls in various formats, we parse with regex
**Need:** Use JSON schema mode for reliable structured output

**Providers that support it:**
- OpenAI (`response_format: {type: "json_schema", ... }`)
- Anthropic (via prompt engineering)
- Minimax (unknown, needs testing)

### 3. ICP Scoring Workflow
**Current:** Discovery returns all businesses
**Need:** Workflow that scores & ranks by conversion potential

**File:** `packages/harness/src/workflows/score-leads.ts` (new)
**Logic:**
```typescript
For each business:
  score = 0
  if (reviews < 50) score += 30      // Room for improvement
  if (!signals.advertising) score += 25  // Not using ads
  if (revenue_signals high) score += 25  // Has money
  if (website_score < 60) score += 20    // Needs help
  
Return top N by score
```

### 4. Email Workflows
**Missing workflows:**
- `draft-email` - Generate personalized email from owner + audit data
- `schedule-email` - Add to send queue with datetime
- `send-gmail` - Actually send via Gmail API
- `track-followup` - Schedule follow-up based on no reply

**These are defined in PLAYBOOKS.md but not implemented**

## Quick Win: Test Current Setup

You can ALREADY do a semi-manual flow:

### Step 1: Discover
```bash
cargo run  # Start daemon
# Chat: "Call discover-businesses for HVAC in Denver, limit 10"
```

The LLM should generate:
```json
{
  "tool": "harness.execute",
  "input": {
    "workflow": "discover-businesses",
    "niche": "HVAC",
    "location": "Denver, CO",
    "limit": 10
  }
}
```

### Step 2: Manual Scoring
Right now you'd need to manually review the 10 businesses and pick the best ones.

### Step 3: Enrich
```bash
# Chat: "Enrich contact for business ID X"
```

### Step 4: Audit
```bash
# Chat: "Run audit for that business"
```

## To Enable Full Conversational Flow

### Priority 1: LLM Tool Discovery (30 min)
Update `LlmExecutor` to fetch and inject tools:

```rust
// In executor.rs, add before LLM call:
fn fetch_tools_from_harness(harness_url: &str) -> Result<Vec<Value>> {
    let client = reqwest::blocking::Client::new();
    let resp = client.get(format!("{}/tools", harness_url)).send()?;
    let data: Value = resp.json()?;
    Ok(data["tools"].as_array().unwrap().clone())
}

// Then in execute():
let tools = fetch_tools_from_harness(&harness_url)?;
body["tools"] = json!(tools);
```

**This alone will enable:**
- "Find HVAC businesses in Denver" → Agent knows to call `discover-businesses`
- "Enrich the first one" → Agent knows to call `enrich-contact`

### Priority 2: ICP Scoring (1 hour)
Create `workflows/score-leads.ts`:

```typescript
async function scoreLeadsHandler(ctx, input) {
  const { businesses, criteria } = input;
  
  const scored = businesses.map(b => ({
    ...b,
    icpScore: calculateICPScore(b, criteria),
  }));
  
  scored.sort((a, b) => b.icpScore - a.icpScore);
  
  return {
    topLeads: scored.slice(0, 10),
    allScored: scored,
  };
}
```

### Priority 3: Email Workflows (2 hours)
1. `draft-email` - Use LLM to generate personalized email
2. `schedule-email` - Store in SQLite queue
3. `send-gmail` - Send via existing Gmail executor

## Cost Per Complete Flow

| Step | Provider | Cost |
|------|----------|------|
| Discover 100 businesses | Apify | $0.50 |
| Score top 10 | Local | $0 |
| Enrich 10 contacts | Perplexity | $0.05 |
| Audit 10 websites | nabl Python | $0.80 |
| Draft 10 emails | Claude | $0.05 |
| **Total** | | **$1.40** |

**Per qualified lead: $0.14** 🎯

## Next Steps

1. **Test current setup** - Try the semi-manual flow above
2. **Add tool discovery** - 30 min code change to enable auto-orchestration
3. **Build ICP scoring** - Make "top 10 likely to convert" work
4. **Add email workflows** - Complete the automation

Want me to implement Priority 1 (tool discovery) now? That's the blocker for conversational orchestration.
