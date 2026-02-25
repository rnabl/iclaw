# Production Deployment Guide - oneclaw.chat

## ✅ Completed Steps

### 1. URL Hardening (Fixed)
- ✅ `packages/harness/src/api/routes.ts` - Dynamic HARNESS_URL and OAuth redirect
- ✅ `oneclaw-node/src/executor.rs` - Environment-aware defaults
- ✅ `oneclaw-node/src/daemon.rs` - Production URL support (3 locations)

### 2. Environment Configuration (Ready)
- ✅ `.env.production` created with all required variables
- ⚠️ **YOU MUST FILL IN** these values before deploying:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `TOKEN_ENCRYPTION_KEY` (generate new for prod!)
  - LLM API keys (same as local)

### 3. Deployment Script (Ready)
- ✅ `scripts/setup-vps.sh` - Full automated VPS setup
- Includes: Node.js, Rust, Docker, Nginx, SSL, systemd services

## 🚀 Deployment Steps

### Step 1: Prepare Your VPS
```bash
# Get a VPS from DigitalOcean, Hetzner, or Vultr
# Recommended specs for 12-16h/day operation:
# - 2 vCPU, 4GB RAM, 80GB SSD (~$20/month)
# - Ubuntu 22.04 LTS

# Point oneclaw.chat A record to your VPS IP
# Wait for DNS propagation (5-30 minutes)
```

### Step 2: Configure Production Environment
```bash
# On your LOCAL machine, edit .env.production:
nano .env.production

# Required changes:
# 1. Generate new encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to TOKEN_ENCRYPTION_KEY

# 2. Add your Google OAuth credentials
# 3. Add your LLM API keys (Anthropic, OpenAI, etc.)
```

### Step 3: Deploy to VPS
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Create a non-root user (if not exists)
adduser oneclaw
usermod -aG sudo oneclaw
su - oneclaw

# Download and run deployment script
curl -o setup-vps.sh https://raw.githubusercontent.com/yourusername/oneclaw/main/scripts/setup-vps.sh
chmod +x setup-vps.sh

# Edit the script to set your repo URL, then run:
./setup-vps.sh
```

The script will:
- Install all dependencies (Node.js, Rust, Docker, Nginx)
- Clone/update the repository
- Build the project
- Setup systemd services
- Configure Nginx reverse proxy
- Setup SSL with Let's Encrypt
- Start all services

### Step 4: Update Google Cloud Console
```
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   https://oneclaw.chat/oauth/google/callback
4. Save
```

### Step 5: Verify Deployment
```bash
# Test health endpoint
curl https://oneclaw.chat/health

# Expected response:
# {"status":"healthy","timestamp":"..."}

# Test OAuth configuration
curl https://oneclaw.chat/oauth/status

# Expected response:
# {"configured":true}

# Test tools endpoint
curl https://oneclaw.chat/tools

# Expected: List of registered tools
```

### Step 6: Connect Gmail Account
```bash
# Open in browser:
https://oneclaw.chat/oauth/google

# Complete OAuth flow
# You should be redirected back with success message
```

### Step 7: Test Sub-Agent Launch
```bash
# Launch a test outreach workflow
curl -X POST https://oneclaw.chat/agents/outreach/launch \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "HVAC",
    "location": "Denver, CO",
    "senderName": "Ryan",
    "senderEmail": "ryan@example.com",
    "maxEmails": 3,
    "dryRun": true,
    "tenantId": "test-prod-1"
  }'

# Check status
curl https://oneclaw.chat/agents/status

# View logs
curl https://oneclaw.chat/agents/summary
```

## 📊 Cost Estimation (12-16h/day operation)

### VPS Options:
1. **DigitalOcean Droplet** - $20/month
   - 2 vCPU, 4GB RAM, 80GB SSD
   - 4TB transfer
   
2. **Hetzner Cloud** - €15/month (~$16)
   - 2 vCPU, 4GB RAM, 80GB SSD
   - 20TB transfer
   
3. **Vultr** - $18/month
   - 2 vCPU, 4GB RAM, 80GB SSD
   - 3TB transfer

### LLM API Costs (estimated for HVAC outreach):
- Discovery (Perplexity): ~$0.02 per city
- Email generation (Claude): ~$0.005 per email
- For 100 emails/day: ~$2-5/day = $60-150/month

### Total: ~$75-170/month for full automation

## 🔧 Production Management

### View Logs
```bash
# Harness API logs
sudo journalctl -u oneclaw-harness -f

# Node Daemon logs
sudo journalctl -u oneclaw-node -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart harness
sudo systemctl restart oneclaw-harness

# Restart node
sudo systemctl restart oneclaw-node

# Restart nginx
sudo systemctl restart nginx
```

### Update Code
```bash
cd ~/oneclaw
git pull
pnpm install
cd packages/harness && pnpm build && cd ../..
cd oneclaw-node && cargo build --release && cd ..
sudo systemctl restart oneclaw-harness oneclaw-node
```

## 🔒 Security Checklist

- ✅ SSL/TLS enabled via Let's Encrypt
- ✅ OAuth tokens encrypted at rest
- ✅ Environment variables protected
- ⚠️ TODO: Setup firewall rules (ufw)
- ⚠️ TODO: Enable fail2ban for SSH protection
- ⚠️ TODO: Regular security updates (unattended-upgrades)

## 📈 Scaling Options (Future)

1. **Horizontal scaling**: Multiple VPS instances behind load balancer
2. **Container orchestration**: Kubernetes for sub-agents
3. **Managed services**: 
   - AWS Lambda for sub-agents (event-driven)
   - Google Cloud Run for harness API
   - Managed Postgres for state storage

## 🆘 Troubleshooting

### Service won't start
```bash
# Check service status
sudo systemctl status oneclaw-harness
sudo systemctl status oneclaw-node

# Check logs
sudo journalctl -u oneclaw-harness --no-pager -l
sudo journalctl -u oneclaw-node --no-pager -l
```

### OAuth not working
1. Check `.env` file has correct credentials
2. Verify redirect URI in Google Console matches exactly
3. Check SSL is working: `curl -I https://oneclaw.chat`

### Sub-agents failing
1. Check Docker is running: `docker ps`
2. Check log directory permissions: `ls -la ~/oneclaw/logs`
3. Check harness URL in logs: `sudo journalctl -u oneclaw-harness | grep HARNESS_URL`

## 📞 Support

Issues? Check:
1. `sudo journalctl -u oneclaw-harness -n 100`
2. `sudo journalctl -u oneclaw-node -n 100`
3. GitHub Issues: https://github.com/yourusername/oneclaw/issues
