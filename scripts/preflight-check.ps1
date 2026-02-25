# Pre-Flight Check - Run BEFORE deploying to VPS
# This validates your local setup and .env.production file

$errors = 0
$warnings = 0

Write-Host "`n🛫 OneClaw Production Pre-Flight Check" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Check 1: .env.production exists
Write-Host "Check 1: .env.production file..." -NoNewline
if (Test-Path ".env.production") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
    Write-Host "  → Run: Copy .env.local .env.production" -ForegroundColor Yellow
    $errors++
}

# Check 2: Required variables in .env.production
if (Test-Path ".env.production") {
    Write-Host "Check 2: Required environment variables..." -ForegroundColor White
    
    $envContent = Get-Content ".env.production" -Raw
    $required = @{
        "GOOGLE_CLIENT_ID" = "Google OAuth"
        "GOOGLE_CLIENT_SECRET" = "Google OAuth"
        "TOKEN_ENCRYPTION_KEY" = "Token Security"
        "ANTHROPIC_API_KEY" = "LLM"
        "HARNESS_URL" = "Harness API"
    }
    
    foreach ($key in $required.Keys) {
        $desc = $required[$key]
        Write-Host "  - $key ($desc)..." -NoNewline
        
        if ($envContent -match "$key=.+") {
            $value = ($envContent | Select-String "$key=(.+)" -AllMatches).Matches[0].Groups[1].Value.Trim()
            
            # Check for placeholder values
            if ($value -like "*your-*" -or $value -like "*REPLACE*" -or $value -like "*GENERATE*" -or $value -eq "") {
                Write-Host " ⚠️  NOT SET" -ForegroundColor Yellow
                $warnings++
            } elseif ($key -eq "HARNESS_URL" -and $value -notlike "*oneclaw.chat*") {
                Write-Host " ⚠️  Should be https://oneclaw.chat" -ForegroundColor Yellow
                $warnings++
            } else {
                Write-Host " ✅" -ForegroundColor Green
            }
        } else {
            Write-Host " ❌ MISSING" -ForegroundColor Red
            $errors++
        }
    }
}

# Check 3: Token encryption key is not the local dev key
Write-Host "Check 3: Production encryption key..." -NoNewline
if (Test-Path ".env.production") {
    $prodEnv = Get-Content ".env.production" -Raw
    $localEnv = Get-Content ".env.local" -Raw
    
    $prodKey = ($prodEnv | Select-String "TOKEN_ENCRYPTION_KEY=(.+)" -AllMatches).Matches[0].Groups[1].Value.Trim()
    $localKey = ($localEnv | Select-String "TOKEN_ENCRYPTION_KEY=(.+)" -AllMatches).Matches[0].Groups[1].Value.Trim()
    
    if ($prodKey -eq $localKey) {
        Write-Host " ⚠️  USING LOCAL KEY (Generate new for production!)" -ForegroundColor Yellow
        Write-Host "  → Run: node -e `"console.log(require('crypto').randomBytes(32).toString('base64'))`"" -ForegroundColor Yellow
        $warnings++
    } elseif ($prodKey -like "*REPLACE*" -or $prodKey -like "*GENERATE*") {
        Write-Host " ❌ PLACEHOLDER KEY" -ForegroundColor Red
        $errors++
    } else {
        Write-Host " ✅ Unique key set" -ForegroundColor Green
    }
}

# Check 4: Google redirect URI
Write-Host "Check 4: Google OAuth redirect URI..." -NoNewline
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    $redirectUri = ($envContent | Select-String "GOOGLE_REDIRECT_URI=(.+)" -AllMatches).Matches[0].Groups[1].Value.Trim()
    
    if ($redirectUri -eq "https://oneclaw.chat/oauth/google/callback") {
        Write-Host " ✅ Correct" -ForegroundColor Green
    } elseif ($redirectUri -like "*localhost*") {
        Write-Host " ❌ Still using localhost" -ForegroundColor Red
        $errors++
    } else {
        Write-Host " ⚠️  Non-standard: $redirectUri" -ForegroundColor Yellow
        $warnings++
    }
}

# Check 5: scripts/setup-vps.sh exists
Write-Host "Check 5: Deployment script..." -NoNewline
if (Test-Path "scripts/setup-vps.sh") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ MISSING scripts/setup-vps.sh" -ForegroundColor Red
    $errors++
}

# Check 6: Node.js installed (for generating keys)
Write-Host "Check 6: Node.js installed..." -NoNewline
try {
    $nodeVersion = node --version
    Write-Host " ✅ $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $errors++
}

# Check 7: Git status (uncommitted changes)
Write-Host "Check 7: Git status..." -NoNewline
try {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        $changeCount = ($gitStatus -split "`n").Count
        Write-Host " ⚠️  $changeCount uncommitted change(s)" -ForegroundColor Yellow
        Write-Host "  → Consider committing before deploy" -ForegroundColor Yellow
        $warnings++
    } else {
        Write-Host " ✅ Clean" -ForegroundColor Green
    }
} catch {
    Write-Host " ⚠️  Not a git repo" -ForegroundColor Yellow
}

# Check 8: SSH client available (for deployment)
Write-Host "Check 8: SSH client..." -NoNewline
try {
    $sshVersion = ssh -V 2>&1
    Write-Host " ✅ Available" -ForegroundColor Green
} catch {
    Write-Host " ⚠️  Not found (needed for VPS access)" -ForegroundColor Yellow
    $warnings++
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "`nYou're ready to deploy to production.`n" -ForegroundColor Green
    
    Write-Host "📋 Deployment Checklist:" -ForegroundColor Cyan
    Write-Host "1. Get VPS (DigitalOcean/Hetzner, 2 vCPU, 4GB RAM)" -ForegroundColor White
    Write-Host "2. Point DNS: oneclaw.chat → VPS IP" -ForegroundColor White
    Write-Host "3. SSH to VPS as root" -ForegroundColor White
    Write-Host "4. Create user 'oneclaw' with sudo" -ForegroundColor White
    Write-Host "5. Upload: scp scripts/setup-vps.sh .env.production oneclaw@VPS:~/" -ForegroundColor White
    Write-Host "6. Run: ./setup-vps.sh" -ForegroundColor White
    Write-Host "7. Update Google Console redirect URI" -ForegroundColor White
    Write-Host "8. Test: pwsh scripts/test-production.ps1`n" -ForegroundColor White
    
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "⚠️  $warnings warning(s), but no blockers." -ForegroundColor Yellow
    Write-Host "`nYou can proceed with deployment, but review warnings above.`n" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $errors error(s), $warnings warning(s)" -ForegroundColor Red
    Write-Host "`nFix errors above before deploying.`n" -ForegroundColor Red
    
    if ($errors -gt 0) {
        Write-Host "🔧 Quick Fixes:" -ForegroundColor Cyan
        Write-Host "  - Missing .env.production? Copy from .env.local and update URLs" -ForegroundColor White
        Write-Host "  - Generate encryption key: node -e `"console.log(require('crypto').randomBytes(32).toString('base64'))`"" -ForegroundColor White
        Write-Host "  - Update HARNESS_URL to: https://oneclaw.chat" -ForegroundColor White
        Write-Host "  - Update GOOGLE_REDIRECT_URI to: https://oneclaw.chat/oauth/google/callback`n" -ForegroundColor White
    }
    
    exit 1
}
