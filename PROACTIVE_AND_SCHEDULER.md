# Proactive LLM & Scheduler Implementation

## What Was Built

Added two powerful features to make OneClaw autonomous and intelligent:

1. **Proactive Suggestions** - LLM recommends next steps after every workflow
2. **Workflow Scheduler** - Schedule recurring workflows with natural language

## Part 1: Proactive Suggestions

### Files Modified:

#### 1. `packages/harness/src/workflows/templates/executor.ts`
Added `generateSuggestions()` method that analyzes workflow results and suggests:
- **Filter** by quality metrics (review count)
- **Enrich** with contact info
- **Target** non-optimized businesses
- **Generate** outreach emails
- **Schedule** recurring execution
- **Expand** to nearby states

Returns structured suggestions:
```typescript
{
  suggestions: {
    nextSteps: [
      "💡 **Filter** by review count to find businesses most likely to buy",
      "📧 **Enrich** these businesses with owner contact info",
      "✉️ **Generate** personalized cold emails",
      "⏰ **Schedule** this search to run weekly",
      "🗺️ **Expand** to nearby states for more leads"
    ],
    quickActions: [
      { label: "Filter by reviews (50-300)", command: "..." },
      { label: "Find owner contacts", command: "..." }
    ]
  }
}
```

#### 2. `oneclaw-node/templates/SOUL.md`
Updated LLM instructions to:
- Always suggest 2-3 actionable next steps after every workflow
- Display suggestions prominently in responses
- Recognize scheduling requests
- Parse natural language into scheduled tasks

**Example Response Format:**
```
✅ Found 50 HVAC businesses in Texas!

[Results here]

💡 **What's next?**
1. Filter by review count (50-300) to find best prospects
2. Enrich with owner contact info for personalized outreach  
3. Schedule this search to run weekly

Which would you like to do?
```

## Part 2: Workflow Scheduler

### Files Created:

#### 1. `packages/harness/src/scheduler/index.ts`
Core scheduler with:
- **Natural language parsing**: "every Monday at 9am" → cron expression
- **Schedule storage**: In-memory store (ready for SQLite)
- **Cron conversion**: Handles daily, weekly, hourly schedules
- **Next run calculation**: Automatically schedules future executions

**Supported Formats:**
- "every Monday at 9am" → `0 9 * * 1`
- "daily at 5pm" → `0 17 * * *`
- "hourly" → `0 * * * *`
- "Friday 5pm" → `0 17 * * 5`

#### 2. `packages/harness/src/scheduler/heartbeat.ts`
Background worker that:
- Checks for due schedules every 60 seconds
- Executes workflows automatically
- Updates next run time after completion
- Logs success/failure for each execution

**Features:**
- Event-driven execution
- Automatic retry scheduling
- Result tracking
- Error logging

#### 3. `packages/harness/src/api/routes.ts`
New scheduler endpoints:

```
POST   /schedules             - Create schedule
GET    /schedules             - List schedules
GET    /schedules/:id         - Get schedule details
PATCH  /schedules/:id         - Update schedule
DELETE /schedules/:id         - Delete schedule
POST   /scheduler/start       - Start heartbeat
POST   /scheduler/stop        - Stop heartbeat
```

## Usage Examples

### 1. Get Proactive Suggestions

```powershell
# Run any workflow
$result = Invoke-RestMethod -Uri "http://localhost:9000/workflows/state-discovery" ...

# Suggestions are automatically included
$result.suggestions.nextSteps
```

**Output:**
```
💡 **Filter** by review count to find best prospects
📧 **Enrich** these businesses with owner contact info
✉️ **Generate** personalized cold emails
⏰ **Schedule** this search to run weekly
🗺️ **Expand** to nearby states: Wyoming, Utah, New Mexico
```

### 2. Create a Schedule (Chat/API)

```powershell
$body = @{
    name = "Weekly HVAC Discovery"
    description = "Find new HVAC businesses every Monday"
    workflow = "state-level-discovery"
    params = @{
        niche = "HVAC"
        state = "Colorado"
        cities = @("Denver")
        limit = 10
        tenantId = "user123"
    }
    schedule = "every Monday at 9am"
    tenantId = "user123"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:9000/schedules" -Method Post -ContentType "application/json" -Body $body
```

**Response:**
```json
{
  "schedule": {
    "id": "abc123",
    "name": "Weekly HVAC Discovery",
    "workflow": "state-level-discovery",
    "cron": "00 09 * * 1",
    "nextRun": "2026-03-02T16:00:00.000Z",
    "enabled": true
  }
}
```

### 3. Start Scheduler Heartbeat

```powershell
Invoke-RestMethod -Uri "http://localhost:9000/scheduler/start" -Method Post
```

**Result:**
```
[Scheduler] ❤️  Heartbeat started (checking every 60s)
```

### 4. Natural Language Examples

**In Chat:**
- "Find HVAC businesses in Denver every Monday at 9am"
- "Check for new leads daily"
- "Run this search weekly on Fridays"
- "Schedule emails to go out every Tuesday at 10am"

**LLM Parses:**
```typescript
{
  schedule: "every Monday at 9am",
  workflow: "state-level-discovery",
  params: { niche: "HVAC", state: "Colorado", cities: ["Denver"] }
}
```

## Test Results

### ✅ Test 1: Proactive Suggestions
```
Input: Find HVAC in Denver
Output: 
  - 💡 **Enrich** these businesses with owner contact info
  - ✉️ **Generate** personalized cold emails  
  - ⏰ **Schedule** this search to run weekly
  - 🗺️ **Expand** to nearby states: Wyoming, Utah, New Mexico
```

### ✅ Test 2: Create Schedule
```
Input: "every Monday at 9am"
Parsed: { dayOfWeek: 1, timeOfDay: "09:00", cron: "00 09 * * 1" }
Next Run: 2026-03-02T16:00:00.000Z
Status: Created ✅
```

### ✅ Test 3: Heartbeat Started
```
Status: started
Logs: [Scheduler] ❤️  Heartbeat started (checking every 60s)
```

## Architecture

```
User Request
    ↓
Natural Language: "Find HVAC every Monday at 9am"
    ↓
LLM Parses → { workflow, params, schedule }
    ↓
Create Schedule → Store in DB
    ↓
Heartbeat (60s loop) → Check for due schedules
    ↓
Execute Workflow → Run discovery
    ↓
Update Schedule → Calculate next run
    ↓
Return Results + Suggestions
```

## Key Features

### Proactive Suggestions:
- ✅ Analyze workflow results automatically
- ✅ Context-aware recommendations
- ✅ Actionable next steps
- ✅ Quick action buttons (for UI)
- ✅ Smart suggestions based on data quality

### Scheduler:
- ✅ Natural language parsing
- ✅ Cron-based scheduling
- ✅ Automatic execution
- ✅ Error handling & retry
- ✅ Result tracking
- ✅ Future: Notifications, webhooks, email delivery

## Next Steps (Future)

1. **Notifications**: Email/SMS when scheduled workflows complete
2. **Conditional Execution**: Only run if new businesses found
3. **Workflow Chaining**: Auto-enrich → Auto-email discovered businesses
4. **SQLite Persistence**: Survive restarts
5. **Schedule Analytics**: Track success rates, costs, results over time
6. **Smart Scheduling**: "Run when competitors post" (event-driven)

## Impact

**Before:**
- User had to remember to re-run searches
- No suggestions for next steps
- Manual, reactive workflow

**After:**
- Autonomous 24/7 operation
- Proactive recommendations after every task
- Set-and-forget automation
- Natural language scheduling

**This is the foundation for fully autonomous AI agents!** 🚀
