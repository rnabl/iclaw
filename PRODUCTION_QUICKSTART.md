# OneClaw Production - Quick Reference

## 🚀 Fast Deploy (You're Here)

```bash
# 1. Get VPS (DigitalOcean recommended)
# - 2 vCPU, 4GB RAM, 80GB SSD
# - Ubuntu 22.04
# - Cost: ~$20/month

# 2. Point DNS
# A record: oneclaw.chat → YOUR_VPS_IP

# 3. SSH to VPS
ssh root@YOUR_VPS_IP

# 4. Create user
adduser oneclaw
usermod -aG sudo oneclaw
su - oneclaw

# 5. Run deployment script
curl -o setup-vps.sh https://raw.githubusercontent.com/YOURUSERNAME/oneclaw/main/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
# Enter email for SSL when prompted

# 6. Update Google Console
# https://console.cloud.google.com/apis/credentials
# Add: https://oneclaw.chat/oauth/google/callback

# 7. Test
pwsh scripts/test-production.ps1
```

## ✅ What's Been Done

### Code Changes
- ✅ Fixed hardcoded URLs in 4 files:
  - `packages/harness/src/api/routes.ts`
  - `oneclaw-node/src/executor.rs`
  - `oneclaw-node/src/daemon.rs` (3 locations)

### Created Files
- ✅ `.env.production` - Production environment template
- ✅ `scripts/setup-vps.sh` - Automated VPS deployment
- ✅ `scripts/test-production.ps1` - Production test suite
- ✅ `PRODUCTION_DEPLOY.md` - Full deployment guide
- ✅ `PRODUCTION_QUICKSTART.md` - This file

## ⚠️ Before Deploying - REQUIRED

Edit `.env.production` on your local machine:

```bash
# 1. Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy to TOKEN_ENCRYPTION_KEY

# 2. Add your credentials
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
# ... other API keys
```

Then copy to VPS:
```bash
scp .env.production oneclaw@YOUR_VPS_IP:~/oneclaw/.env
```

## 📊 Cost Breakdown (12-16h/day)

| Item | Cost/Month |
|------|------------|
| VPS (DigitalOcean 4GB) | $20 |
| LLM APIs (100 emails/day) | $60-150 |
| SSL Certificate | $0 (Let's Encrypt) |
| Domain | ~$12/year |
| **Total** | **~$80-170/month** |

### Cheapest Option
- Hetzner Cloud: €15/month (~$16) - saves $4/month
- Use Claude Haiku for emails: reduces API costs by ~50%
- **Total: ~$75/month**

## 🔧 Common Commands

### On VPS (via SSH)
```bash
# View logs
sudo journalctl -u oneclaw-harness -f
sudo journalctl -u oneclaw-node -f

# Restart services
sudo systemctl restart oneclaw-harness
sudo systemctl restart oneclaw-node

# Check status
sudo systemctl status oneclaw-harness
sudo systemctl status oneclaw-node

# Update code
cd ~/oneclaw
git pull
pnpm install
cd packages/harness && pnpm build && cd ../..
cd oneclaw-node && cargo build --release && cd ..
sudo systemctl restart oneclaw-harness oneclaw-node
```

### From Your Local Machine
```bash
# Test health
curl https://oneclaw.chat/health

# Check OAuth
curl https://oneclaw.chat/oauth/status

# Run test suite
pwsh scripts/test-production.ps1

# Launch test workflow
curl -X POST https://oneclaw.chat/agents/outreach/launch \
  -H "Content-Type: application/json" \
  -d '{"niche":"HVAC","location":"Denver, CO","senderName":"Ryan","senderEmail":"ryan@example.com","maxEmails":3,"dryRun":true,"tenantId":"test-1"}'
```

## 🎯 Immediate Next Steps (After Deploy)

1. **Connect Gmail** (5 min)
   ```
   https://oneclaw.chat/oauth/google
   ```

2. **Test Discovery** (2 min)
   ```bash
   curl -X POST https://oneclaw.chat/execute \
     -H "Content-Type: application/json" \
     -d '{"tool":"discover","params":{"query":"HVAC Denver","limit":5}}'
   ```

3. **Test Outreach** (5 min)
   ```bash
   # Dry run (won't send emails)
   curl -X POST https://oneclaw.chat/agents/outreach/launch \
     -H "Content-Type: application/json" \
     -d '{"niche":"HVAC","location":"Denver, CO","senderName":"Ryan","senderEmail":"your@email.com","maxEmails":5,"dryRun":true,"tenantId":"test-1"}'
   ```

4. **Setup Monitoring** (10 min)
   - Setup uptime monitoring (UptimeRobot, Pingdom)
   - Configure log rotation
   - Setup backup for `.env` and `data/` directories

## 🆘 Troubleshooting

### Service won't start
```bash
sudo journalctl -u oneclaw-harness --no-pager -l | tail -50
```

### OAuth errors
1. Check credentials in `.env`
2. Verify redirect URI in Google Console
3. Test: `curl https://oneclaw.chat/oauth/status`

### Sub-agents failing
```bash
docker ps  # Check Docker is running
ls -la ~/oneclaw/logs/agents  # Check permissions
```

### SSL issues
```bash
sudo certbot certificates  # Check cert status
sudo certbot renew --dry-run  # Test renewal
```

## 📈 Scaling (Future)

### Current: Single VPS
- Handles ~100-500 emails/day
- Cost: $75-170/month

### Next: Multi-Region
- 2-3 VPS instances + load balancer
- Handles ~1000+ emails/day
- Cost: $200-400/month

### Future: Serverless
- AWS Lambda for sub-agents
- RDS for state
- Handles unlimited scale
- Cost: Pay-per-use (~$500-1000/month at high volume)

## 📞 Need Help?

1. Check logs first: `sudo journalctl -u oneclaw-harness -n 100`
2. Review: [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md)
3. Test locally first with same config
4. GitHub Issues: https://github.com/YOURUSERNAME/oneclaw/issues

---

**Status**: Ready to deploy! All code changes complete, scripts ready.

**Time to Production**: ~30 minutes (if DNS is ready)

**Next**: Run `./setup-vps.sh` on your VPS
