# Sub-Agent Architecture

## Overview

OneClaw implements a **parallel agent architecture** where:

- **Main Agent**: Orchestrates workflows, monitors logs, provides LLM interface
- **Sub-Agents**: Domain-specific workers running in isolated environments (local processes or Docker containers)

This design provides:
- **Security**: Ephemeral credentials, isolated execution
- **Scalability**: Multiple sub-agents can run in parallel
- **Resilience**: Sub-agent failures don't crash the main system
- **Observability**: Structured JSONL logs for monitoring

## Components

### 1. Outreach Sub-Agent (`sub-agents/outreach/`)

Autonomous agent for email outreach workflow:

```
Discovery → Find Competitors → Generate Emails → Send (with rate limiting)
```

**Files:**
- `src/index.ts` - Main entry point
- `src/logger.ts` - Structured JSONL logging
- `src/harness-client.ts` - API client for main harness
- `src/email-template.ts` - Email generation templates

**Configuration (Environment Variables):**
| Variable | Description | Default |
|----------|-------------|---------|
| `NICHE` | Business niche to target | `HVAC` |
| `LOCATION` | Target location | `Denver, Colorado` |
| `SENDER_NAME` | Your name for emails | `Ryan` |
| `SENDER_EMAIL` | Your email address | required |
| `MAX_EMAILS` | Maximum emails to send | `10` |
| `DRY_RUN` | If "true", don't send emails | `true` |
| `MIN_REVIEWS` | Min review count filter | `50` |
| `MAX_REVIEWS` | Max review count filter | `300` |
| `LOG_DIR` | Directory for log files | `/workspace/logs` |

### 2. Log Monitor (`packages/harness/src/agents/log-monitor.ts`)

Watches sub-agent log files and provides:
- Real-time status tracking
- Error alerting
- Summary generation for LLM context

### 3. Docker Configuration

**Dockerfile** (`sub-agents/outreach/Dockerfile`):
- Multi-stage build for minimal image size
- Runs as non-root user for security
- Health checks included

**docker-compose.agents.yml**:
- Shared log volume for communication
- Automatic harness dependency
- Optional log monitoring container

## API Endpoints

### Launch Sub-Agent
```
POST /agents/outreach/launch
{
  "niche": "HVAC",
  "location": "Denver, Colorado",
  "senderName": "Ryan",
  "senderEmail": "ryan@example.com",
  "maxEmails": 5,
  "dryRun": true,
  "tenantId": "your-tenant-id"
}
```

### Get Status
```
GET /agents/status?agentId=outreach
```

### Get Logs
```
GET /agents/:agentId/:runId/logs?limit=50
```

### Get Summary (for LLM)
```
GET /agents/summary
```

### Monitor Control
```
POST /agents/monitor/start
POST /agents/monitor/stop
```

## Usage

### Local Development

1. Start the harness:
```bash
cd packages/harness && npm run dev
```

2. Launch an outreach agent via API:
```powershell
$body = @{
    niche = "HVAC"
    location = "Colorado"
    senderName = "Ryan"
    senderEmail = "ryan@example.com"
    maxEmails = 5
    dryRun = $true
    tenantId = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9000/agents/outreach/launch" -Method Post -Body $body -ContentType "application/json"
```

3. Check logs:
```powershell
Get-Content ./logs/agents/outreach-*.jsonl | ConvertFrom-Json | Select-Object -Last 10
```

### Docker Mode

1. Start Docker Desktop

2. Build the image:
```bash
docker build -t oneclaw-outreach-agent ./sub-agents/outreach
```

3. Run with compose:
```bash
docker-compose -f docker-compose.agents.yml up harness
docker-compose -f docker-compose.agents.yml run --rm outreach-agent
```

## Log Format

Logs are written as JSONL (one JSON object per line):

```json
{
  "timestamp": "2026-02-25T01:34:40.559Z",
  "agentId": "outreach",
  "runId": "UhCQ3YVOrU",
  "level": "info",
  "event": "workflow_completed",
  "message": "Done! 2/3 sent",
  "data": {
    "discovered": 3,
    "emailed": 2,
    "failed": 0
  }
}
```

**Event Types:**
- `workflow_started` - Agent started with config
- `step_1_discovery` - Beginning discovery
- `business_discovered` - Found a business
- `competitor_found` - Found competitor for business
- `email_generated` - Email ready to send
- `email_sent` / `email_dry_run` - Email sent or simulated
- `email_failed` - Email send failed
- `workflow_completed` - Done with stats
- `workflow_failed` - Fatal error

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Agent                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Harness    │  │ Log Monitor  │  │   LLM API    │     │
│  │   API        │──│   watches    │──│   summaries  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 ▲                                 │
│         │                 │                                 │
│         ▼                 │                                 │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Shared Log Volume                   │       │
│  │              /workspace/logs/                    │       │
│  └─────────────────────────────────────────────────┘       │
│         ▲                 ▲                 ▲              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
   ┌──────┴─────┐    ┌──────┴─────┐    ┌──────┴─────┐
   │  Outreach  │    │  Research  │    │   Other    │
   │  Sub-Agent │    │  Sub-Agent │    │  Sub-Agent │
   │  (sidecar) │    │  (sidecar) │    │  (sidecar) │
   └────────────┘    └────────────┘    └────────────┘
```

## Next Steps

1. **Email Integration**: Connect to real email provider (SendGrid, Gmail API)
2. **Real Discovery**: Wire up to actual Apify/Harness discovery tools
3. **Firecracker MicroVMs**: Production-grade isolation (vs Docker sidecars)
4. **More Sub-Agents**: Research agent, social media agent, etc.
5. **Queue System**: Redis/BullMQ for better job management
