# State-Level Workflow Test
# Test the new workflow template system

# Choose your state and niche
$state = "Texas"  # Change to any state
$niche = "Roofing" # Change to any niche
$limit = 10        # Results per city

Write-Host "🚀 Testing State-Level Discovery Workflow" -ForegroundColor Cyan
Write-Host "State: $state" -ForegroundColor Yellow
Write-Host "Niche: $niche" -ForegroundColor Yellow
Write-Host "Limit per city: $limit" -ForegroundColor Yellow
Write-Host ""

# Create payload
$payload = @{
    niche = $niche
    state = $state
    limit = $limit
    tenantId = "test-tenant"
} | ConvertTo-Json

Write-Host "📤 Sending request to Harness..." -ForegroundColor Cyan

# Execute workflow
$result = Invoke-RestMethod -Uri "http://localhost:9000/workflows/state-discovery" `
    -Method Post `
    -ContentType "application/json" `
    -Body $payload

Write-Host ""
Write-Host "✅ Workflow Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Execution ID: $($result.executionId)" -ForegroundColor Yellow
Write-Host "Total Businesses: $($result.totalBusinesses)" -ForegroundColor Yellow
Write-Host "Cities Searched: $($result.cities.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cities: $($result.cities -join ', ')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Show summary
Write-Host $result.summary
Write-Host ""

# Show sample businesses
Write-Host "📊 Sample Results (first 3):" -ForegroundColor Cyan
$result.businesses | Select-Object -First 3 | ForEach-Object {
    Write-Host ""
    Write-Host "  Name: $($_.name)" -ForegroundColor Yellow
    Write-Host "  City: $($_.city), $($_.state)" -ForegroundColor Gray
    Write-Host "  Rating: $($_.rating) ⭐ ($($_.reviewCount) reviews)" -ForegroundColor Gray
    Write-Host "  Website: $($_.website)" -ForegroundColor Gray
    if ($_.signals) {
        Write-Host "  Signals:" -ForegroundColor Cyan
        Write-Host "    - SEO Optimized: $($_.signals.seoOptimized)" -ForegroundColor Gray
        Write-Host "    - Has Ads: $($_.signals.hasAds)" -ForegroundColor Gray
        Write-Host "    - Has Booking: $($_.signals.hasBooking)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "💾 Full results saved to:" -ForegroundColor Cyan
$outputPath = "workflow-results-$state-$niche.json"
$result | ConvertTo-Json -Depth 10 | Out-File $outputPath
Write-Host "  $outputPath" -ForegroundColor Yellow
