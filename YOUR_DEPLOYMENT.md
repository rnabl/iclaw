# OneClaw Production Deployment - Your Configuration

## Your Setup (Logged for Future Reference)

### VPS Details
- **Provider**: DigitalOcean
- **IP Address**: `104.131.111.116`
- **Domain**: `oneclaw.chat` (already configured)
- **SSH Access**: ✅ Already configured

### Repository
- **GitHub**: https://github.com/rnabl/oneclaw
- **Branch**: `main`

---

## Quick Deployment Steps (Your Specific Setup)

### STEP 1: Generate Encryption Key (2 min)

```powershell
# On your LOCAL machine (Windows)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and update `.env.production`:

```powershell
# Edit the file
notepad .env.production

# Find and replace this line:
TOKEN_ENCRYPTION_KEY=REPLACE_WITH_NEW_KEY_FOR_PRODUCTION

# With your generated key:
TOKEN_ENCRYPTION_KEY=YOUR_KEY_HERE

# Save and close
```

### STEP 2: Upload Files to Your VPS (1 min)

```powershell
# From project root
cd "C:\Users\Ryan Nguyen\OneDrive\Desktop\Projects\oneclaw"

# Upload deployment script and environment
scp scripts/setup-vps.sh root@104.131.111.116:~/
scp .env.production root@104.131.111.116:~/

# Verify upload
ssh root@104.131.111.116 "ls -la ~/"
```

### STEP 3: SSH to VPS and Prepare (2 min)

```powershell
# Connect to VPS
ssh root@104.131.111.116
```

Once connected, create the oneclaw user if not exists:

```bash
# Check if user exists
id oneclaw 2>/dev/null

# If not, create it
if [ $? -ne 0 ]; then
    adduser oneclaw
    usermod -aG sudo oneclaw
fi

# Switch to oneclaw user
su - oneclaw
```

### STEP 4: Edit Deployment Script (1 min)

```bash
# Copy files from root to oneclaw home
sudo cp /root/setup-vps.sh ~/
sudo cp /root/.env.production ~/
sudo chown oneclaw:oneclaw ~/setup-vps.sh ~/env.production

# Make script executable
chmod +x ~/setup-vps.sh

# Edit the script to use your GitHub repo
nano ~/setup-vps.sh
```

**Find this section (around line 85-90)**:
```bash
# Clone or pull repository
REPO_DIR="$HOME/oneclaw"
if [ -d "$REPO_DIR" ]; then
    echo "📥 Updating repository..."
    cd "$REPO_DIR"
    git pull
else
    echo "📥 Cloning repository..."
    cd "$HOME"
    git clone https://github.com/yourusername/oneclaw.git
    cd oneclaw
fi
```

**Change to**:
```bash
# Clone or pull repository
REPO_DIR="$HOME/oneclaw"
if [ -d "$REPO_DIR" ]; then
    echo "📥 Updating repository..."
    cd "$REPO_DIR"
    git pull
else
    echo "📥 Cloning repository..."
    cd "$HOME"
    git clone https://github.com/rnabl/oneclaw.git
    cd oneclaw
fi
```

**Save**: Press `Ctrl+X`, then `Y`, then `Enter`

### STEP 5: Run Deployment (15-20 min)

```bash
# On VPS (as oneclaw user)
./setup-vps.sh
```

**When prompted for email**: Enter your email for SSL certificate notifications.

**The script will**:
1. Install Node.js 20, Rust, Docker, Nginx
2. Clone from https://github.com/rnabl/oneclaw
3. Install dependencies (`pnpm install`)
4. Build TypeScript (`pnpm build`)
5. Build Rust daemon (`cargo build --release`)
6. Setup systemd services (auto-restart)
7. Configure Nginx reverse proxy
8. Setup SSL with Let's Encrypt for `oneclaw.chat`
9. Start all services

**Watch for**:
- Green "✅" checkmarks
- "Deployment complete!" message

### STEP 6: Update Google OAuth (1 min)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `100050746367-i438hpgres4e3kfsproukgr25f6bjas8.apps.googleusercontent.com`
3. Click to edit
4. Add to **"Authorized redirect URIs"**:
   ```
   https://oneclaw.chat/oauth/google/callback
   ```
5. Click **"Save"**

### STEP 7: Verify Deployment (3 min)

```powershell
# From your LOCAL machine (Windows)
# Test health endpoint
Invoke-RestMethod -Uri "https://oneclaw.chat/health" -TimeoutSec 10

# Should show:
# status: healthy
# scheduler: { running: true }
# environment: production
```

Check SSL:
```powershell
curl -I https://oneclaw.chat
# Should show: HTTP/2 200
```

### STEP 8: Run Test Suite (5 min)

```powershell
# From LOCAL machine
cd "C:\Users\Ryan Nguyen\OneDrive\Desktop\Projects\oneclaw"
powershell -File scripts/test-production.ps1
```

Expected: 7-8 tests pass (OAuth account not connected yet is OK)

### STEP 9: Connect Gmail (1 min)

1. Open: https://oneclaw.chat/oauth/google
2. Sign in with your Gmail
3. Grant permissions
4. Should see: "Gmail account connected successfully"

Verify:
```powershell
Invoke-RestMethod -Uri "https://oneclaw.chat/api/v1/oauth/google/status"
# Should show: connected: true
```

### STEP 10: Create First Schedule (2 min)

```powershell
$body = @{
    name = "Daily HVAC Colorado"
    workflow = "outreach"
    params = @{
        niche = "HVAC"
        location = "Colorado"
        senderName = "Ryan"
        senderEmail = "YOUR_GMAIL@gmail.com"
        maxEmails = 10
        dryRun = $false
    }
    schedule = "every day at 9am"
    tenantId = "ryan-prod"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://oneclaw.chat/schedules" -Method Post -Body $body -ContentType "application/json"
```

---

## Future Deployments (Updates)

When you push new code to GitHub:

```bash
# SSH to VPS
ssh root@104.131.111.116
su - oneclaw

# Update code
cd ~/oneclaw
git pull

# Install new dependencies (if any)
pnpm install

# Rebuild
cd packages/harness && pnpm build && cd ../..
cd oneclaw-node && cargo build --release && cd ..

# Restart services
sudo systemctl restart oneclaw-harness oneclaw-node

# Check status
sudo systemctl status oneclaw-harness
```

Or use the quick update script:

```bash
# Create update script
nano ~/update-oneclaw.sh
```

```bash
#!/bin/bash
cd ~/oneclaw
git pull
pnpm install
cd packages/harness && pnpm build && cd ../..
cd oneclaw-node && cargo build --release && cd ..
sudo systemctl restart oneclaw-harness oneclaw-node
echo "✅ OneClaw updated and restarted"
```

```bash
chmod +x ~/update-oneclaw.sh

# Use it
./update-oneclaw.sh
```

---

## Monitoring Commands

### Check Services
```bash
ssh root@104.131.111.116 "sudo systemctl status oneclaw-harness oneclaw-node"
```

### View Logs (Real-time)
```bash
ssh root@104.131.111.116 "sudo journalctl -u oneclaw-harness -f"
```

### View Recent Logs
```bash
ssh root@104.131.111.116 "sudo journalctl -u oneclaw-harness -n 100"
```

### Check Health from Windows
```powershell
Invoke-RestMethod -Uri "https://oneclaw.chat/health"
```

### List Active Schedules
```powershell
Invoke-RestMethod -Uri "https://oneclaw.chat/schedules?tenantId=ryan-prod"
```

---

## Toggle Workflows

### Get Schedule ID
```powershell
$schedules = Invoke-RestMethod -Uri "https://oneclaw.chat/schedules?tenantId=ryan-prod"
$schedules.schedules | Format-Table id, name, enabled, nextRun
```

### Disable Schedule
```powershell
$scheduleId = "YOUR_SCHEDULE_ID"
Invoke-RestMethod -Uri "https://oneclaw.chat/schedules/$scheduleId" -Method Patch -Body '{"enabled":false}' -ContentType "application/json"
```

### Enable Schedule
```powershell
Invoke-RestMethod -Uri "https://oneclaw.chat/schedules/$scheduleId" -Method Patch -Body '{"enabled":true}' -ContentType "application/json"
```

---

## Troubleshooting

### Service Won't Start
```bash
ssh root@104.131.111.116
sudo journalctl -u oneclaw-harness --no-pager -l | tail -50
```

### Restart Services
```bash
ssh root@104.131.111.116
sudo systemctl restart oneclaw-harness oneclaw-node
```

### Check Disk Space
```bash
ssh root@104.131.111.116 "df -h"
```

### Check Memory
```bash
ssh root@104.131.111.116 "free -h"
```

---

## Quick Reference

| What | Command |
|------|---------|
| SSH to VPS | `ssh root@104.131.111.116` |
| Health check | `curl https://oneclaw.chat/health` |
| View logs | `sudo journalctl -u oneclaw-harness -f` |
| Restart harness | `sudo systemctl restart oneclaw-harness` |
| Update code | `cd ~/oneclaw && git pull && ./update-oneclaw.sh` |
| List schedules | PowerShell: `Invoke-RestMethod -Uri "https://oneclaw.chat/schedules?tenantId=ryan-prod"` |

---

**Your VPS**: `104.131.111.116`  
**Your Domain**: `oneclaw.chat`  
**Your Repo**: `https://github.com/rnabl/oneclaw`

Ready to deploy! 🚀
