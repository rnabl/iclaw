# Test Sub-Agent System
# Tests both local and Docker modes

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Sub-Agent System Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$harnessUrl = "http://localhost:9000"

# Test 1: Check harness health
Write-Host "`n[1] Checking harness health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$harnessUrl/health" -Method Get
    Write-Host "    Harness: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "    ERROR: Harness not running. Start with: cd packages/harness && npm run dev" -ForegroundColor Red
    exit 1
}

# Test 2: Start agent monitoring
Write-Host "`n[2] Starting agent monitor..." -ForegroundColor Yellow
try {
    $monitor = Invoke-RestMethod -Uri "$harnessUrl/agents/monitor/start" -Method Post
    Write-Host "    Monitor: $($monitor.status)" -ForegroundColor Green
} catch {
    Write-Host "    WARNING: Could not start monitor - $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 3: Launch outreach agent (local mode - dry run)
Write-Host "`n[3] Launching outreach sub-agent (DRY RUN)..." -ForegroundColor Yellow
$launchBody = @{
    niche = "HVAC"
    location = "Denver, Colorado"
    senderName = "Ryan"
    senderEmail = "ryan@example.com"
    maxEmails = 3
    dryRun = $true
    tenantId = "test-tenant"
} | ConvertTo-Json

try {
    $launch = Invoke-RestMethod -Uri "$harnessUrl/agents/outreach/launch" -Method Post -Body $launchBody -ContentType "application/json"
    Write-Host "    Launched: $($launch.launched)" -ForegroundColor Green
    Write-Host "    Mode: $($launch.mode)" -ForegroundColor Cyan
    Write-Host "    PID: $($launch.pid)" -ForegroundColor Cyan
} catch {
    Write-Host "    ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Wait for agent to run
Write-Host "`n[4] Waiting for agent to complete (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test 4: Check agent status
Write-Host "`n[5] Checking agent status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$harnessUrl/agents/status" -Method Get
    Write-Host "    Agents found: $($status.agents.Count)" -ForegroundColor Green
    foreach ($agent in $status.agents) {
        Write-Host "      - $($agent.agentId): $($agent.status) (last: $($agent.lastEvent))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "    WARNING: Could not get status - $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 5: Get agent summary
Write-Host "`n[6] Getting agent summary..." -ForegroundColor Yellow
try {
    $summary = Invoke-RestMethod -Uri "$harnessUrl/agents/summary" -Method Get
    Write-Host $summary.summary -ForegroundColor Cyan
} catch {
    Write-Host "    WARNING: Could not get summary - $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   Test Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Build Docker image: docker build -t oneclaw-outreach-agent ./sub-agents/outreach" -ForegroundColor White
Write-Host "  2. Run with Docker:    docker-compose -f docker-compose.agents.yml run outreach-agent" -ForegroundColor White
Write-Host "  3. Check logs:         Get-Content ./logs/agents/outreach-*.jsonl" -ForegroundColor White
