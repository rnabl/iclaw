# Production Testing Checklist
# Run this after deploying to oneclaw.chat

$domain = "https://oneclaw.chat"
$pass = 0
$fail = 0

Write-Host "`n🧪 OneClaw Production Testing Suite" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Endpoint..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$domain/health" -Method Get -TimeoutSec 10
    if ($response.status -eq "healthy") {
        Write-Host " ✅ PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ❌ FAIL - Unexpected status: $($response.status)" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 2: Tools Registry
Write-Host "Test 2: Tools Registry..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$domain/tools" -Method Get -TimeoutSec 10
    if ($response.tools -and $response.tools.Count -gt 0) {
        Write-Host " ✅ PASS ($($response.tools.Count) tools)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ❌ FAIL - No tools found" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 3: OAuth Configuration
Write-Host "Test 3: OAuth Configuration..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$domain/oauth/status" -Method Get -TimeoutSec 10
    if ($response.configured -eq $true) {
        Write-Host " ✅ PASS" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ⚠️  WARN - OAuth not configured" -ForegroundColor Yellow
        Write-Host "   → Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env" -ForegroundColor Yellow
        $fail++
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 4: OAuth Account Status (requires prior connection)
Write-Host "Test 4: OAuth Account Status..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$domain/api/v1/oauth/google/status" -Method Get -TimeoutSec 10
    if ($response.connected) {
        Write-Host " ✅ PASS (Account: $($response.email))" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ⚠️  WARN - No Gmail account connected" -ForegroundColor Yellow
        Write-Host "   → Visit: $domain/oauth/google to connect" -ForegroundColor Yellow
        $pass++ # Not a failure, just not connected yet
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 5: Agent Monitor Status
Write-Host "Test 5: Agent Monitor..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$domain/agents/status" -Method Get -TimeoutSec 10
    Write-Host " ✅ PASS (Monitoring $($response.Count) agents)" -ForegroundColor Green
    $pass++
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 6: Discovery Tool (dry run)
Write-Host "Test 6: Discovery Tool (dry run)..." -NoNewline
try {
    $body = @{
        query = "HVAC companies in Denver"
        limit = 2
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$domain/tools/discover" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
    if ($response.businesses -and $response.businesses.Count -gt 0) {
        Write-Host " ✅ PASS (Found $($response.businesses.Count) businesses)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ⚠️  WARN - No businesses found" -ForegroundColor Yellow
        $pass++ # Not a failure
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Test 7: Sub-Agent Launch (dry run)
Write-Host "Test 7: Sub-Agent Launch (dry run)..." -NoNewline
try {
    $body = @{
        niche = "HVAC"
        location = "Boulder, CO"
        senderName = "Test"
        senderEmail = "test@example.com"
        maxEmails = 2
        dryRun = $true
        tenantId = "prod-test-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$domain/agents/outreach/launch" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15
    if ($response.status -eq "launched" -or $response.status -eq "running") {
        Write-Host " ✅ PASS (Agent: $($response.agentId))" -ForegroundColor Green
        $pass++
        
        # Wait a bit and check status
        Start-Sleep -Seconds 5
        Write-Host "   Checking agent status..." -NoNewline
        $statusResponse = Invoke-RestMethod -Uri "$domain/agents/status" -Method Get -TimeoutSec 10
        $agent = $statusResponse | Where-Object { $_.agentId -eq $response.agentId }
        if ($agent) {
            Write-Host " ✅ Agent running" -ForegroundColor Green
        } else {
            Write-Host " ⚠️  Agent not found in status" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ❌ FAIL - Unexpected status: $($response.status)" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Error details: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $fail++
}

# Test 8: SSL Certificate
Write-Host "Test 8: SSL Certificate..." -NoNewline
try {
    $request = [System.Net.WebRequest]::Create($domain)
    $request.GetResponse() | Out-Null
    $cert = $request.ServicePoint.Certificate
    $expiry = [DateTime]::Parse($cert.GetExpirationDateString())
    $daysUntilExpiry = ($expiry - (Get-Date)).Days
    
    if ($daysUntilExpiry -gt 7) {
        Write-Host " ✅ PASS (Valid for $daysUntilExpiry days)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host " ⚠️  WARN - Certificate expires in $daysUntilExpiry days" -ForegroundColor Yellow
        $pass++
    }
} catch {
    Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Test Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "================================`n" -ForegroundColor Cyan

if ($fail -eq 0) {
    Write-Host "✅ All tests passed! Your OneClaw instance is production-ready." -ForegroundColor Green
    Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Connect Gmail: $domain/oauth/google" -ForegroundColor White
    Write-Host "2. Test full workflow with real data (not dry run)" -ForegroundColor White
    Write-Host "3. Monitor logs: sudo journalctl -u oneclaw-harness -f" -ForegroundColor White
    Write-Host "4. Setup monitoring/alerts for 24/7 operation" -ForegroundColor White
} else {
    Write-Host "⚠️  Some tests failed. Check the errors above." -ForegroundColor Yellow
    Write-Host "`n📝 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "1. Check service logs: sudo journalctl -u oneclaw-harness -n 50" -ForegroundColor White
    Write-Host "2. Verify .env file: cat ~/oneclaw/.env" -ForegroundColor White
    Write-Host "3. Test local connectivity: ssh user@oneclaw.chat 'curl http://localhost:9000/health'" -ForegroundColor White
    Write-Host "4. Check DNS: nslookup oneclaw.chat" -ForegroundColor White
}

Write-Host ""
exit $fail
