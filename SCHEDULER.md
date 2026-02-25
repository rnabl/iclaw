# OneClaw Workflow Scheduler

Toggle workflows on/off and schedule automated execution.

## Quick Start

### Start the Scheduler
```powershell
# Start the scheduler heartbeat (checks every 60s)
Invoke-RestMethod -Uri "http://localhost:9000/scheduler/start" -Method Post
```

### Create a Schedule
```powershell
$body = @{
    name = "Daily HVAC Colorado"
    description = "Find and email HVAC businesses in Colorado"
    workflow = "outreach"
    params = @{
        niche = "HVAC"
        location = "Colorado"
        senderName = "Ryan"
        senderEmail = "ryan@example.com"
        maxEmails = 50
        dryRun = $false
    }
    schedule = "every day at 9am"
    tenantId = "ryan-prod"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:9000/schedules" -Method Post -Body $body -ContentType "application/json"
```

### Toggle Workflow On/Off
```powershell
# Disable
Invoke-RestMethod -Uri "http://localhost:9000/schedules/YOUR_SCHEDULE_ID" -Method Patch `
  -Body '{"enabled": false}' -ContentType "application/json"

# Enable
Invoke-RestMethod -Uri "http://localhost:9000/schedules/YOUR_SCHEDULE_ID" -Method Patch `
  -Body '{"enabled": true}' -ContentType "application/json"
```

### List Your Schedules
```powershell
Invoke-RestMethod -Uri "http://localhost:9000/schedules?tenantId=ryan-prod"
```

## Natural Language Scheduling

The scheduler understands natural language:

| Input | Cron | Description |
|-------|------|-------------|
| `every day at 9am` | `00 09 * * *` | Daily at 9:00 AM |
| `every day at 2:30pm` | `30 14 * * *` | Daily at 2:30 PM |
| `hourly` | `0 * * * *` | Every hour |
| `weekly on Monday at 10am` | `00 10 * * 1` | Mondays at 10 AM |
| `every Friday at 3pm` | `00 15 * * 5` | Fridays at 3 PM |

Or use raw cron: `"cron": "30 9 * * 1-5"` (9:30 AM weekdays)

## Supported Workflows

| Workflow | Description | Key Params |
|----------|-------------|------------|
| `outreach` | Full discovery + email | `niche`, `location`, `senderName`, `senderEmail`, `maxEmails`, `dryRun` |
| `discovery` | Business discovery only | `niche`, `location`, `limit` |
| `state-level-discovery` | Multi-city discovery | `state`, `niche`, `maxCities` |

## API Reference

### POST /scheduler/start
Start the scheduler heartbeat.

### POST /scheduler/stop
Stop the scheduler heartbeat.

### POST /schedules
Create a new schedule.

**Body:**
```json
{
  "name": "Schedule Name",
  "description": "Optional description",
  "workflow": "outreach",
  "params": { ... },
  "schedule": "every day at 9am",
  "tenantId": "user_123"
}
```

### GET /schedules?tenantId=xxx
List schedules for a tenant.

### GET /schedules/:id
Get schedule details.

### PATCH /schedules/:id
Update a schedule.

**Body:**
```json
{
  "enabled": false,
  "schedule": "every Monday at 10am"
}
```

### DELETE /schedules/:id
Delete a schedule.

### GET /health
Includes scheduler status:
```json
{
  "status": "healthy",
  "scheduler": {
    "running": true,
    "activeWorkflows": 2
  },
  "environment": "production"
}
```

## Production Behavior

In **production** (`NODE_ENV=production`):
- Scheduler auto-starts on server boot
- Uses `https://oneclaw.chat` as HARNESS_URL
- Uses production OAuth redirect URI

In **development**:
- Scheduler must be started manually (`POST /scheduler/start`)
- Uses `http://localhost:9000` as HARNESS_URL

To force auto-start in development:
```bash
AUTO_START_SCHEDULER=true npm run dev
```

## Environment Detection

The system automatically detects the environment:

1. **Explicit**: `ONECLAW_ENV=production`
2. **Node.js**: `NODE_ENV=production`
3. **URL Detection**: `HARNESS_URL` contains `oneclaw.chat`
4. **Docker**: `DOCKER_CONTAINER=true`

## Example: 24/7 Outreach Agent

```powershell
# Create schedules for different regions/times

# Morning - East Coast
$eastCoast = @{
    name = "Morning East Coast HVAC"
    workflow = "outreach"
    params = @{ niche = "HVAC"; location = "New York"; maxEmails = 25 }
    schedule = "every day at 8am"
    tenantId = "ryan"
} | ConvertTo-Json -Depth 3

# Midday - Central
$central = @{
    name = "Midday Central HVAC"
    workflow = "outreach"
    params = @{ niche = "HVAC"; location = "Texas"; maxEmails = 25 }
    schedule = "every day at 11am"
    tenantId = "ryan"
} | ConvertTo-Json -Depth 3

# Afternoon - West Coast
$westCoast = @{
    name = "Afternoon West Coast HVAC"
    workflow = "outreach"
    params = @{ niche = "HVAC"; location = "California"; maxEmails = 25 }
    schedule = "every day at 2pm"
    tenantId = "ryan"
} | ConvertTo-Json -Depth 3

# Create all schedules
Invoke-RestMethod -Uri "http://localhost:9000/schedules" -Method Post -Body $eastCoast -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:9000/schedules" -Method Post -Body $central -ContentType "application/json"
Invoke-RestMethod -Uri "http://localhost:9000/schedules" -Method Post -Body $westCoast -ContentType "application/json"
```

## Testing

```powershell
# Run the scheduler test script
pwsh scripts/test-scheduler.ps1
```

## Files Changed

- `packages/harness/src/utils/env.ts` - Environment detection utilities
- `packages/harness/src/scheduler/heartbeat.ts` - Outreach workflow support
- `packages/harness/src/server.ts` - Auto-start scheduler
- `packages/harness/src/api/routes.ts` - Enhanced health endpoint
- `scripts/test-scheduler.ps1` - Test script
