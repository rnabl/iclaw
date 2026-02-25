# Workflow Template System - Phase 2

**Date**: 2026-02-24  
**Status**: 🚧 In Progress  

---

## Overview

Building a declarative workflow system that allows you to say:
> "Find all HVAC businesses in Colorado"

And OneClaw automatically:
1. Researches cities in Colorado
2. Queues discovery for each city (3 at a time)
3. Uses ephemeral tokens (30 min max per city)
4. Caches results for aggregation
5. Returns comprehensive results

---

## Architecture

```
User Input
    ↓
Intent Matcher (LLM)
    ↓
Workflow Template
    ↓
┌─────────────────────────────────┐
│   Workflow Executor             │
│                                 │
│  ┌────────┐  ┌────────┐        │
│  │ Step 1 │→ │ Cache  │        │
│  └────────┘  └────────┘        │
│       ↓                         │
│  ┌────────────────────┐        │
│  │   Task Queue       │        │
│  │  (Ephemeral        │        │
│  │   Tokens)          │        │
│  └────────────────────┘        │
│   ↓     ↓     ↓                │
│  Task  Task  Task              │
│  (2min)(2min)(2min)            │
│   ↓     ↓     ↓                │
│ Cache Cache Cache              │
└─────────────────────────────────┘
```

---

## Files Created

### 1. Type Definitions
**File**: `packages/harness/src/workflows/templates/types.ts`

Defines:
- `WorkflowTemplate` - Template schema
- `WorkflowStep` - Individual step definition
- `WorkflowExecution` - Runtime state
- `QueuedTask` - Queue item
- `ExecutionStrategy` - sync/queue/parallel

### 2. State-Level Discovery Template
**File**: `packages/harness/src/workflows/templates/state-level-discovery.ts`

**What it does**:
```typescript
// User says: "Find all HVAC in Colorado"
STATE_LEVEL_DISCOVERY({
  niche: "HVAC",
  state: "Colorado"
})

// Steps:
// 1. Research cities (if not provided)
// 2. Discover businesses (queued, 3 cities at a time)
// 3. Aggregate results (dedupe by googlePlaceId)
// 4. Filter/qualify (optional)
// 5. Generate summary
```

**Security**:
- Each city gets fresh ephemeral token (3 min TTL)
- Token revoked immediately after completion
- If one city leaks, only affects that city

**Features**:
- ✅ Caching (results saved per city)
- ✅ Resumable (if fails, can continue)
- ✅ Parallel execution (3 cities at once)
- ✅ Auto-retry (3 attempts with backoff)

### 3. Task Queue System
**File**: `packages/harness/src/workflows/templates/queue.ts`

**Features**:
- Manages async task execution
- Creates ephemeral token per task
- Revokes token after completion
- Retry with exponential backoff
- Concurrent processing (max 5 default)

**Example**:
```typescript
await taskQueue.enqueue({
  executionId: 'exec-123',
  stepId: 'discover-businesses',
  tool: 'discover-businesses',
  input: { niche: 'HVAC', location: 'Denver, CO' },
  tenantId: 'user-123',
  tokenTTL: 180,  // 3 minutes
  maxAttempts: 3
});
```

### 4. Ephemeral Tokens
**File**: `packages/harness/src/workflows/auth/ephemeral-tokens.ts`

**Security Model**:
```typescript
// Create token (max 30 min)
const token = await createEphemeralToken({
  tenantId: 'user-123',
  workflowId: 'discover-businesses',
  expiresIn: 1800,  // 30 minutes
  scopes: ['execute:discover-businesses']
});

// Use token
await executeWorkflow({ token });

// Revoke immediately after
await revokeToken(token.token);
```

**Benefits**:
- ✅ No long-lived secrets
- ✅ Scoped permissions
- ✅ Auto-expiry
- ✅ Immediate revocation

---

## Example: Colorado HVAC Discovery

### User Input:
```
"Find all HVAC businesses in Colorado"
```

### Execution:
```
[00:00] Intent matched: state-level-discovery
[00:01] Step 1: Research cities
        → LLM generates: [Denver, Colorado Springs, Aurora, ...]
        → Cached for 24 hours
[00:03] Step 2: Queue discovery (15 cities)
        → Task 1: Denver (token expires in 3 min)
        → Task 2: Colorado Springs (token expires in 3 min)
        → Task 3: Aurora (token expires in 3 min)
[00:23] Task 1 complete → token revoked
[00:25] Task 2 complete → token revoked
        → Task 4: Fort Collins (new token)
[00:28] Task 3 complete → token revoked
        → Task 5: Lakewood (new token)
...
[05:00] All cities complete
[05:01] Step 3: Aggregate (dedupe)
        → 287 unique HVAC businesses
[05:02] Step 5: Generate summary
```

### Output:
```markdown
## HVAC Businesses in Colorado

**Found**: 287 businesses across 15 cities
**Top Cities**:
- Denver: 85 businesses
- Colorado Springs: 52 businesses
- Aurora: 31 businesses

**Stats**:
- With website: 245 (85%)
- SEO optimized: 142 (49%)
- Running ads: 78 (27%)
- Has booking: 123 (43%)

### Actions Available:
- Filter by review count
- Enrich with owner contact
- Generate outreach emails
```

---

## Next Steps

### Still Need to Build:
1. ✅ Workflow executor (runs template with params)
2. ✅ Result cache (save step outputs)
3. ✅ Intent matcher (LLM maps input → template)
4. ✅ Template registry (manage templates)
5. ✅ Additional templates (outreach, 24/7 agent, etc.)

### Then Test:
```
User: "Find all HVAC businesses in Colorado"
→ System executes state-level-discovery template
→ Returns 287 businesses
→ Asks: "Would you like me to filter by review count or enrich with contacts?"
```

---

## Security Benefits

| Risk | Before | After |
|------|--------|-------|
| **Long-lived secrets** | ❌ 2 hour workflow = 2 hour exposure | ✅ Max 3 min per city |
| **Blast radius** | ❌ One leak = entire workflow | ✅ One leak = one city |
| **Token revocation** | ❌ Can't revoke mid-workflow | ✅ Revoked immediately |
| **Resumability** | ❌ Fail = start over | ✅ Cached, can resume |

---

## SaaS Ready

This architecture supports:
- ✅ **Multi-tenant** - Each execution gets own tokens
- ✅ **24/7 agents** - Queue never sleeps, tokens expire
- ✅ **Cost control** - Per-city metering
- ✅ **Abuse prevention** - Short-lived, scoped tokens
- ✅ **Compliance** - Audit trail per task
