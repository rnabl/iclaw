# Test Scheduler Integration
# Run this after starting the harness server

$harnessUrl = "http://localhost:9000"

Write-Host "`n🧪 OneClaw Scheduler Integration Test" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Test 1: Health endpoint with scheduler status
Write-Host "Test 1: Health endpoint (scheduler status)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$harnessUrl/health" -Method Get -TimeoutSec 10
    if ($response.scheduler) {
        Write-Host " ✅" -ForegroundColor Green
        Write-Host "   Scheduler running: $($response.scheduler.running)" -ForegroundColor White
        Write-Host "   Active workflows: $($response.scheduler.activeWorkflows)" -ForegroundColor White
        Write-Host "   Environment: $($response.environment)" -ForegroundColor White
    } else {
        Write-Host " ⚠️ No scheduler info in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n⚠️ Make sure the harness is running: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Test 2: Start scheduler
Write-Host "`nTest 2: Start scheduler..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$harnessUrl/scheduler/start" -Method Post -TimeoutSec 10
    if ($response.status -eq "started" -or $response.status -eq "already_running") {
        Write-Host " ✅ $($response.status)" -ForegroundColor Green
    } else {
        Write-Host " ⚠️ Unexpected: $($response | ConvertTo-Json)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Create a test schedule (won't actually run - far future)
Write-Host "`nTest 3: Create test schedule..." -NoNewline
try {
    $scheduleBody = @{
        name = "Test HVAC Outreach - Denver"
        description = "Test schedule for scheduler integration"
        workflow = "outreach"
        params = @{
            niche = "HVAC"
            location = "Denver, CO"
            senderName = "Test"
            senderEmail = "test@example.com"
            maxEmails = 3
            dryRun = $true
        }
        schedule = "every day at 11pm"  # Won't run soon
        tenantId = "test-scheduler-" + (Get-Date -Format "yyyyMMdd")
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "$harnessUrl/schedules" -Method Post -Body $scheduleBody -ContentType "application/json" -TimeoutSec 10
    if ($response.schedule) {
        Write-Host " ✅ Created" -ForegroundColor Green
        Write-Host "   ID: $($response.schedule.id)" -ForegroundColor White
        Write-Host "   Cron: $($response.schedule.cron)" -ForegroundColor White
        Write-Host "   Next Run: $($response.schedule.nextRun)" -ForegroundColor White
        Write-Host "   Enabled: $($response.schedule.enabled)" -ForegroundColor White
        $scheduleId = $response.schedule.id
    } else {
        Write-Host " ❌ No schedule in response" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $scheduleId = $null
}

# Test 4: List schedules
Write-Host "`nTest 4: List schedules..." -NoNewline
try {
    $tenantId = "test-scheduler-" + (Get-Date -Format "yyyyMMdd")
    $response = Invoke-RestMethod -Uri "$harnessUrl/schedules?tenantId=$tenantId" -Method Get -TimeoutSec 10
    Write-Host " ✅ Found $($response.schedules.Count) schedule(s)" -ForegroundColor Green
    
    foreach ($schedule in $response.schedules) {
        Write-Host "   - $($schedule.name) | $($schedule.cron) | Enabled: $($schedule.enabled)" -ForegroundColor White
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Toggle schedule off
if ($scheduleId) {
    Write-Host "`nTest 5: Toggle schedule OFF..." -NoNewline
    try {
        $toggleBody = @{ enabled = $false } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$harnessUrl/schedules/$scheduleId" -Method Patch -Body $toggleBody -ContentType "application/json" -TimeoutSec 10
        if ($response.schedule.enabled -eq $false) {
            Write-Host " ✅ Disabled" -ForegroundColor Green
        } else {
            Write-Host " ⚠️ Still enabled" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 6: Toggle schedule back on
    Write-Host "`nTest 6: Toggle schedule ON..." -NoNewline
    try {
        $toggleBody = @{ enabled = $true } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$harnessUrl/schedules/$scheduleId" -Method Patch -Body $toggleBody -ContentType "application/json" -TimeoutSec 10
        if ($response.schedule.enabled -eq $true) {
            Write-Host " ✅ Enabled" -ForegroundColor Green
        } else {
            Write-Host " ⚠️ Still disabled" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 7: Delete test schedule (cleanup)
    Write-Host "`nTest 7: Delete test schedule (cleanup)..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$harnessUrl/schedules/$scheduleId" -Method Delete -TimeoutSec 10
        Write-Host " ✅ Deleted" -ForegroundColor Green
    } catch {
        Write-Host " ⚠️ Cleanup failed (not critical)" -ForegroundColor Yellow
    }
}

# Test 8: Create immediate test (run in 1 minute)
Write-Host "`nTest 8: Create schedule for immediate execution..." -NoNewline
try {
    # Create a schedule that runs "now" - we'll use a cron that matches current minute + 1
    $nextMinute = (Get-Date).AddMinutes(1)
    $cronMinute = $nextMinute.Minute
    $cronHour = $nextMinute.Hour
    
    $scheduleBody = @{
        name = "Immediate Test - HVAC Denver"
        description = "Test immediate execution"
        workflow = "outreach"
        params = @{
            niche = "HVAC"
            location = "Denver, CO"
            senderName = "Test"
            senderEmail = "test@example.com"
            maxEmails = 2
            dryRun = $true
        }
        cron = "$cronMinute $cronHour * * *"  # Run at specific minute/hour today
        tenantId = "test-immediate-" + (Get-Date -Format "yyyyMMddHHmmss")
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "$harnessUrl/schedules" -Method Post -Body $scheduleBody -ContentType "application/json" -TimeoutSec 10
    if ($response.schedule) {
        Write-Host " ✅ Created (runs at $($nextMinute.ToString('HH:mm')))" -ForegroundColor Green
        Write-Host "   ID: $($response.schedule.id)" -ForegroundColor White
        Write-Host "   Cron: $($response.schedule.cron)" -ForegroundColor White
        Write-Host "`n   ⏳ Watch the harness logs to see it execute in ~1 minute!" -ForegroundColor Cyan
        
        $immediateId = $response.schedule.id
    } else {
        Write-Host " ❌ Failed" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "✅ Scheduler Integration Tests Complete!" -ForegroundColor Green
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "📋 What you can do now:" -ForegroundColor Cyan
Write-Host "1. Watch harness logs for the immediate schedule execution" -ForegroundColor White
Write-Host "2. Create a real schedule via API or curl" -ForegroundColor White
Write-Host "3. Toggle schedules on/off with PATCH /schedules/:id" -ForegroundColor White
Write-Host "4. Deploy to production and have 24/7 automated outreach!`n" -ForegroundColor White

Write-Host "📝 Example: Create daily outreach schedule" -ForegroundColor Cyan
Write-Host @"
`$body = @{
    name = "Daily HVAC Colorado"
    workflow = "outreach"
    params = @{
        niche = "HVAC"
        location = "Colorado"
        senderName = "Ryan"
        senderEmail = "your@email.com"
        maxEmails = 50
        dryRun = `$false
    }
    schedule = "every day at 9am"
    tenantId = "ryan-prod"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "$harnessUrl/schedules" -Method Post -Body `$body -ContentType "application/json"
"@ -ForegroundColor Gray

Write-Host ""
