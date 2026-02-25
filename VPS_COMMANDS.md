# Quick Deployment Commands - Copy/Paste These

# You're already SSH'd in as root@104.131.111.116
# Run these commands in order:

# ============================================
# STEP 1: Check if files were uploaded
# ============================================
ls -la ~/ | grep -E 'setup-vps|env.production'

# If you don't see them, upload from Windows first:
# scp scripts/setup-vps.sh root@104.131.111.116:~/
# scp .env.production root@104.131.111.116:~/

# ============================================
# STEP 2: Create oneclaw user
# ============================================
id oneclaw 2>/dev/null || (adduser oneclaw && usermod -aG sudo oneclaw)
# Enter a password when prompted (you'll need this later)

# ============================================
# STEP 3: Copy files to oneclaw user
# ============================================
cp ~/setup-vps.sh /home/oneclaw/
cp ~/.env.production /home/oneclaw/
chown oneclaw:oneclaw /home/oneclaw/setup-vps.sh /home/oneclaw/.env.production

# ============================================
# STEP 4: Switch to oneclaw user
# ============================================
su - oneclaw

# ============================================
# STEP 5: Make script executable
# ============================================
chmod +x ~/setup-vps.sh

# ============================================
# STEP 6: Edit script to use your GitHub repo
# ============================================
nano ~/setup-vps.sh

# Find this line (around line 85-90):
#   git clone https://github.com/yourusername/oneclaw.git
# Change to:
#   git clone https://github.com/rnabl/oneclaw.git
# Save: Ctrl+X, then Y, then Enter

# ============================================
# STEP 7: Run deployment (takes 15-20 minutes)
# ============================================
./setup-vps.sh
# When prompted for email, enter your email for SSL cert

# ============================================
# After deployment completes:
# ============================================

# Check services are running:
sudo systemctl status oneclaw-harness
sudo systemctl status oneclaw-node

# View logs:
sudo journalctl -u oneclaw-harness -n 50

# If all good, exit SSH:
exit  # Exit oneclaw user
exit  # Exit root
