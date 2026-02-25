# Outreach Agent Quick Start

**Goal**: Automate cold outreach for your marketing agency.

---

## Prerequisites

### 1. Running Services
```bash
# Terminal 1: Harness (port 9000)
cd packages/harness
pnpm dev

# Terminal 2: Daemon (port 8787)
cd oneclaw-node
cargo run -- daemon
```

### 2. API Keys in `.env`
```env
# Discovery
BRAVE_API_KEY=xxx           # Or use APIFY_API_TOKEN
APIFY_API_TOKEN=xxx

# Auditing (your Python service)
NABL_AUDIT_URL=http://localhost:8001
NABL_API_SECRET=xxx
DATAFORSEO_LOGIN=xxx
DATAFORSEO_PASSWORD=xxx

# Research
PERPLEXITY_API_KEY=xxx
GOOGLE_API_KEY=xxx          # For Gemini (owner extraction)

# Email
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# LLM
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx
```

---

## Current Status

### ✅ Working Now
| Step | Workflow | Status |
|------|----------|--------|
| 1. Discover | `hvac-contact-discovery` | ✅ Works |
| 2. Audit | `audit-website` | ✅ Works (needs nabl service) |
| 3. Score | (algorithm in SKILLS.md) | ✅ Defined |
| 4. Enrich | (part of discover) | ✅ Works |

### ❌ Need to Build
| Step | Workflow | Time |
|------|----------|------|
| 5. Research | `perplexity-research` | 30 min |
| 6. Draft | `draft-email` | 1 hour |
| 7. Approve | Approval queue | 30 min |
| 8. Send | `send-gmail` | 1 hour |
| 9. Follow-up | Follow-up logic | 30 min |

---

## What You Can Do Today

### Test Discovery + Audit
```bash
# Open chat at http://localhost:8787
# Then say:

"Find 10 HVAC companies in Denver and audit them"
```

**What happens**:
1. Agent calls `hvac-contact-discovery`:
   - Searches Brave/Apify
   - Scrapes websites for owner names
   - Returns 10 businesses with contact info

2. Agent calls `audit-website` for each:
   - Calls your nabl Python service
   - Gets SEO + AI visibility scores
   - Returns audit report

3. Agent shows results:
   - List of businesses
   - Audit scores
   - Owner names (if found)

### Expected Output
```
Found 10 HVAC companies in Denver:

1. ABC Heating & Cooling
   Owner: John Smith
   Website: https://abchvac.com
   SEO Score: 42/100
   AI Visibility: 15/100 ⚠️
   Status: HOT LEAD (score: 78)

2. Denver Air Systems
   Owner: Sarah Johnson
   ...
```

---

## What's Missing for Full Pipeline

### 1. Research Workflow (~30 min)
Create `packages/harness/src/workflows/perplexity-research.ts`:

```typescript
import { z } from 'zod';

const ResearchInput = z.object({
  businessName: z.string(),
  location: z.string(),
  website: z.string().optional(),
});

async function perplexityResearchHandler(ctx, input) {
  // Call Perplexity API
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{
        role: 'user',
        content: `Research ${input.businessName} in ${input.location}. 
                  Tell me: years in business, recent news, competitors, 
                  challenges they face, what makes them unique.`
      }]
    })
  });
  
  const data = await response.json();
  return {
    summary: data.choices[0].message.content,
    sources: data.citations || []
  };
}

runner.registerWorkflow('perplexity-research', perplexityResearchHandler);
```

### 2. Draft Email Workflow (~1 hour)
Create `packages/harness/src/workflows/draft-email.ts`:

```typescript
async function draftEmailHandler(ctx, input) {
  const { prospect, auditData, research, template } = input;
  
  // Load template from agent PLAYBOOKS.md
  const templates = {
    ai_visibility: `Subject: ${prospect.businessName} isn't showing up in ChatGPT...

Hi ${prospect.ownerFirstName},

I was researching HVAC companies in ${prospect.city} using ChatGPT 
and noticed ${prospect.businessName} doesn't appear - but your competitors do.

I ran a quick audit:
- SEO Score: ${auditData.seoScore}/100
- AI Visibility: ${auditData.aiVisibilityScore}/100 ⚠️
- Issue: ${auditData.topIssue}

${research?.summary || ''}

Worth a 15-min call?

Ryan`
  };
  
  const draft = templates[template];
  
  return {
    subject: draft.split('\n')[0].replace('Subject: ', ''),
    body: draft.split('\n').slice(2).join('\n'),
    confidence: 85
  };
}
```

### 3. Approval Queue
Simple approach - store in SQLite:

```sql
CREATE TABLE email_drafts (
  id TEXT PRIMARY KEY,
  prospect_id TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME,
  approved_at DATETIME
);
```

Then add commands:
- `"Show pending emails"` → List drafts
- `"Approve email 1,2,3"` → Mark approved
- `"Reject email 2"` → Mark rejected

### 4. Gmail Send (~1 hour)
Use existing Gmail OAuth, add send workflow.

---

## Running Your First Batch

Once the missing workflows are built:

```bash
# 1. Open chat
open http://localhost:8787

# 2. Start the pipeline
"Run outreach for HVAC companies in Denver"

# 3. Agent does all 9 steps automatically:
# [1/9] Discovering businesses... ✓ Found 10
# [2/9] Auditing websites... ✓ 10/10 complete
# [3/9] Scoring prospects... ✓ 3 qualified (score > 70)
# [4/9] Enriching contacts... ✓ Found 2 owners
# [5/9] Researching businesses... ✓ 3/3 complete
# [6/9] Drafting emails... ✓ 3 drafts ready
# [7/9] Awaiting approval...

# 4. Review drafts
"Show me the email drafts"

# 5. Approve and send
"Approve all 3 emails"

# 6. Agent sends via Gmail
# [8/9] Sending emails... ✓ 3/3 sent
# [9/9] Tracking opens...

# Done! 🎉
```

---

## Monitoring

### Real-time Stats
```bash
# Check agent memory
"Show outreach stats"

# Output:
Pipeline Status:
- Discovered: 10
- Audited: 10
- Qualified: 3
- Drafted: 3
- Sent: 3
- Opened: 1 (33%)
- Replied: 0
```

### Heartbeat Status
```bash
"What's the heartbeat doing?"

# Output:
Heartbeat Status:
- Next run: in 12 minutes
- Last run: 18 minutes ago (found 10, qualified 3)
- Rate limits: 23/50 emails today, 87/100 discoveries
```

---

## Cost Tracking

For 10 businesses (full pipeline):
- Discovery: $0.15 (10 businesses with owner extraction)
- Audit: $2.00 (10 sites × $0.20)
- Research: $0.15 (3 qualified × $0.05)
- Draft: $0.06 (3 emails × $0.02)
- Send: $0.00 (Gmail API free)
- **Total**: ~$2.36 for 10 businesses → 3 qualified leads = **$0.79 per lead**

Target: < $0.50 per lead (optimize by reducing full audits)

---

## Troubleshooting

### Discovery Returns 0 Results
- Check API keys: `BRAVE_API_KEY` or `APIFY_API_TOKEN`
- Try different location: "Austin, TX" instead of "Austin"
- Check harness logs: `pnpm --filter @oneclaw/harness dev`

### Audit Fails
- Ensure nabl Python service is running: `curl http://localhost:8001/health`
- Check `NABL_API_SECRET` in `.env`
- Check nabl service logs

### Owner Extraction Fails
- Requires `GOOGLE_API_KEY` (Gemini for LLM extraction)
- Some websites block scraping (expected ~75% success rate)
- Check harness logs for fetch errors

### Agent Doesn't Call Tools
- Check daemon logs: Tool calls should appear as `[TOOL_CALL]` or ````tool` blocks
- Verify harness is running on port 9000
- Check `curl http://localhost:9000/tools` returns tool list

---

## Next Steps

1. **Build missing workflows** (research, draft, send)
2. **Test with 10 businesses**
3. **Measure results** (open rate, response rate)
4. **Iterate on templates** based on data
5. **Scale to 50/day** once proven

---

## Questions?

Check:
- [PROGRESS.md](PROGRESS.md) - Overall status
- [WORKFLOWS.md](WORKFLOWS.md) - Workflow reference
- `~/.oneclaw/agents/outreach/PLAYBOOKS.md` - Full pipeline definition
- `~/.oneclaw/agents/outreach/SKILLS.md` - Scoring algorithm
