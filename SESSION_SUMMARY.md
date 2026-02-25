# Session Summary: 2026-02-20

## What We Built Today

### 1. Outreach Agent Architecture ✅
Created complete agent structure in `~/.oneclaw/agents/outreach/`:
- `SOUL.md` - Personality: "Relentless but respectful cold outreach specialist"
- `IDENTITY.md` - Target niches (HVAC, plumbing, roofing), markets (Denver, Austin, Phoenix), qualification criteria
- `SKILLS.md` - Tool registry, scoring algorithm (secret sauce), cost estimates, timing knowledge
- `PLAYBOOKS.md` - Complete 9-step cold outreach workflow with email templates
- `MEMORY.md` - Auto-updated pipeline stats and learnings
- `HEARTBEAT.md` - 30-minute schedule, rate limits, pause conditions

### 2. Cold Outreach Pipeline Definition ✅
Documented full workflow (Steps 1-9):
1. **DISCOVER** - Find 10 businesses (Brave/Apify) ✅ Workflow exists
2. **AUDIT** - SEO + AI visibility scores ✅ Workflow exists
3. **SCORE & RANK** - Pick top 3 (score > 70) ✅ Algorithm defined
4. **ENRICH** - Find owner/decision-maker ✅ Workflow exists
5. **RESEARCH** - Perplexity deep dive ❌ Need to build
6. **DRAFT EMAIL** - Personalized from template ❌ Need to build
7. **APPROVAL QUEUE** - Wait for Ryan's approval ❌ Need to build
8. **SEND** - Gmail API with tracking ❌ Need to build
9. **FOLLOW-UP** - Auto-bump after 3 days ❌ Logic defined

### 3. Email Templates Created ✅
- **Template A**: AI Visibility hook ("You're not showing up in ChatGPT...")
- **Template B**: Competitor comparison
- **Template C**: Review problem

### 4. Scoring Algorithm (Secret Sauce) ✅
```
SCORE = (100 - SEO_SCORE) * 0.3 
      + (100 - AI_VISIBILITY) * 0.4 
      + REVENUE_SIGNALS * 0.2 
      + ENGAGEMENT_POTENTIAL * 0.1

Hot Lead: SCORE > 70
Warm Lead: SCORE 50-70
Cold Lead: SCORE < 50
```

### 5. Documentation ✅
- `PROGRESS.md` - Overall project status, metrics, architecture decisions
- `WORKFLOWS.md` - Complete workflow reference with input/output schemas
- `OUTREACH.md` - Quick start guide for outreach agent
- Updated agent MDs with complete playbooks

---

## Key Insights

### Product Vision
- **Phase 1**: Build for Ryan's agency (prove 80% automation)
- **Phase 2**: Productize as SaaS for other agencies (multi-tenant)
- **Competitive Advantage**: Not the tech, but the scoring algorithm + email templates + workflow

### Architecture Decisions
1. **Agent per domain** (e.g., outreach, fulfillment, reporting) - reduces context size
2. **Format-agnostic tool parser** - handles multiple LLM output formats
3. **Workspace-based agents** (~/.oneclaw/agents/) - tenant-ready structure
4. **Open source core, proprietary playbooks** - Infrastructure is free, secret sauce is not

### What's Already Built
- Discovery workflows (Brave/Apify)
- Audit workflow (calls nabl Python service)
- Owner extraction (website scraping + LLM)
- Agent OS system (SOUL, IDENTITY, SKILLS, PLAYBOOKS, MEMORY)
- Progressive learning (reflection after interactions)
- Heartbeat service (periodic agent turns)

### What's Missing (Critical Path)
1. `perplexity-research` workflow (~30 min)
2. `draft-email` workflow (~1 hour)
3. `send-gmail` workflow (~1 hour)
4. Approval queue storage + UI (~30 min)

**Total effort to MVP**: ~3 hours of focused work

---

## Cost Analysis

### Per Lead Economics
- Discovery: $0.15/10 businesses
- Audit: $2.00 (10 × $0.20)
- Research: $0.15 (3 qualified × $0.05)
- Draft: $0.06 (3 emails × $0.02)
- Send: $0.00 (Gmail API free)
- **Total**: $2.36/10 businesses → 3 qualified = **$0.79 per lead**
- **Target**: < $0.50 per lead

### Scale Economics
- 50 businesses/day = 15 qualified leads/day = **$11.80/day**
- Month = 450 qualified leads = **$354/month**
- If 3% convert to meetings = 13 meetings/month
- **Cost per meeting**: ~$27

---

## Success Metrics (Targets)

| Metric | Target | Current |
|--------|--------|---------|
| Time saved vs manual | 80% | TBD |
| Open rate | 40% | TBD |
| Response rate | 8% | TBD |
| Meeting rate | 3% | TBD |
| Cost per qualified lead | < $0.50 | $0.79 |
| Cost per meeting | < $50 | ~$27 (projected) |

---

## How It Works (User Perspective)

```bash
# Ryan opens chat
open http://localhost:8787

# Ryan prompts
"Run outreach for HVAC companies in Denver"

# Agent executes all 9 steps automatically
[1/9] Discovering... ✓ Found 10
[2/9] Auditing... ✓ 10/10 complete
[3/9] Scoring... ✓ 3 qualified
[4/9] Enriching... ✓ 2 owners found
[5/9] Researching... ✓ 3/3 complete
[6/9] Drafting... ✓ 3 emails ready
[7/9] Awaiting approval...

# Ryan reviews
"Show me the drafts"

# Ryan approves
"Approve all 3"

# Agent sends
[8/9] Sending... ✓ 3/3 sent
[9/9] Tracking opens...

Done! 🎉
```

---

## Security & Privacy

### Open Source vs Proprietary
- **Open Source**: OneClaw runtime, basic workflows, infrastructure
- **Proprietary**: Scoring algorithm, email templates, PLAYBOOKS.md
- **User Secrets**: Always local in `.env`, encrypted in harness, never in codebase

### Multi-Tenant Strategy (Future)
```
/tenants/
  ├── ryans-agency/
  │   ├── secrets/      # Encrypted API keys
  │   ├── agents/       # Agent brains
  │   └── data/         # Prospects, emails
  └── bobs-agency/
      ├── secrets/
      ├── agents/
      └── data/
```

---

## Next Immediate Actions

1. ✅ **Created outreach agent structure** (done today)
2. ✅ **Documented full 9-step workflow** (done today)
3. ✅ **Defined scoring algorithm** (done today)
4. ❌ **Build missing workflows** (perplexity-research, draft-email, send-gmail)
5. ❌ **Test end-to-end** with real API keys
6. ❌ **Run first batch** (10 HVAC companies in Denver)
7. ❌ **Measure results** (open rate, response rate, time saved)

---

## Questions Answered

**Q**: Why isn't the agent calling tools?  
**A**: LLMs use different formats. We built a format-agnostic parser that handles:
- ````tool` markdown blocks
- `<tool>` XML tags
- `[TOOL_CALL]` markers
- `=>` instead of `:` (Minimax quirk)

**Q**: Where are workflows stored?  
**A**: In TypeScript harness (`packages/harness/src/workflows/`). Agent calls them via `harness.execute(workflow_id, params)`.

**Q**: How do I keep this open-source but protect my secrets?  
**A**: Runtime is open-source. Your PLAYBOOKS.md (with scoring algorithm and templates) stays private. API keys always in local `.env`.

**Q**: How would non-technical users create agents?  
**A**: Chat-based creation - talk to main agent, it creates the folder/MDs programmatically based on conversation.

**Q**: One agent or multiple sub-agents per step?  
**A**: One agent for outreach (Option A). Steps are sequential and related, not independent domains. Keeps context coherent.

---

## Files Created/Modified

### Created
- `~/.oneclaw/agents/outreach/SOUL.md`
- `~/.oneclaw/agents/outreach/IDENTITY.md`
- `~/.oneclaw/agents/outreach/SKILLS.md`
- `~/.oneclaw/agents/outreach/PLAYBOOKS.md`
- `~/.oneclaw/agents/outreach/MEMORY.md`
- `~/.oneclaw/agents/outreach/HEARTBEAT.md`
- `PROGRESS.md`
- `WORKFLOWS.md`
- `OUTREACH.md`
- `SESSION_SUMMARY.md` (this file)

### Modified
- (None today - mainly documentation and planning)

---

## Conversation Context

This session followed previous work on:
- Implementing progressive learning system
- Adding save/update capabilities to Agent OS
- Creating reflection module for post-interaction learning
- Building format-agnostic tool parser
- Integrating Zod schemas for structured output
- Discussing multi-agent/role-based architecture

Previous summary location: [1a4af585-a2be-47f6-aced-142630d9e7f5.txt](C:\Users\Ryan Nguyen\.cursor\projects\c-Users-Ryan-Nguyen-OneDrive-Desktop-Projects-oneclaw/agent-transcripts/1a4af585-a2be-47f6-aced-142630d9e7f5.txt)

---

## Ready for Next Session

**State**: Outreach agent architecture complete, documentation solid, clear path to MVP.

**Next steps**: Build 3 missing workflows (research, draft, send), test end-to-end, run first batch.

**Blockers**: None. All dependencies are in place (harness, daemon, existing workflows).

**Estimated time to working MVP**: ~3 hours focused work.

---

**End of session summary. All progress documented and preserved.** ✅
