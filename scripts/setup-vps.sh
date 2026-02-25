#!/bin/bash
# OneClaw VPS Deployment Script
# Run this on your VPS (Ubuntu 22.04 or later)

set -e

echo "🦞 OneClaw Production Deployment"
echo "================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Don't run as root. Run as regular user with sudo access."
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Installing dependencies..."
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install Rust (for OneClaw Node daemon)
if ! command -v cargo &> /dev/null; then
    echo "🦀 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Install Docker (for sub-agents)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "⚠️  You need to log out and back in for Docker permissions to take effect"
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

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

# Install dependencies
echo "📦 Installing project dependencies..."
pnpm install

# Build Rust daemon
echo "🦀 Building OneClaw Node daemon..."
cd oneclaw-node
cargo build --release
cd ..

# Setup environment file
echo "⚙️  Setting up environment..."
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found! Please create it with:"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo "  - TOKEN_ENCRYPTION_KEY (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "  - LLM API keys"
    exit 1
fi

# Copy environment file
cp .env.production .env

# Build TypeScript harness
echo "🔨 Building TypeScript harness..."
cd packages/harness
pnpm build
cd ../..

# Setup systemd service for harness
echo "⚙️  Setting up systemd service for Harness..."
sudo tee /etc/systemd/system/oneclaw-harness.service > /dev/null <<EOF
[Unit]
Description=OneClaw Harness API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR/packages/harness
Environment="NODE_ENV=production"
Environment="PORT=9000"
EnvironmentFile=$REPO_DIR/.env
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Setup systemd service for node daemon
echo "⚙️  Setting up systemd service for Node Daemon..."
sudo tee /etc/systemd/system/oneclaw-node.service > /dev/null <<EOF
[Unit]
Description=OneClaw Node Daemon
After=network.target oneclaw-harness.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR/oneclaw-node
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=$REPO_DIR/.env
ExecStart=$REPO_DIR/oneclaw-node/target/release/oneclaw-node
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Setup Nginx reverse proxy
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/oneclaw > /dev/null <<'EOF'
# Harness API (main API)
server {
    listen 80;
    server_name oneclaw.chat;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/oneclaw /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL..."
read -p "Enter your email for SSL certificate: " EMAIL
sudo certbot --nginx -d oneclaw.chat --non-interactive --agree-tos -m "$EMAIL"

# Start services
echo "🚀 Starting services..."
sudo systemctl enable oneclaw-harness oneclaw-node
sudo systemctl start oneclaw-harness
sleep 5
sudo systemctl start oneclaw-node

# Check status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Service Status:"
sudo systemctl status oneclaw-harness --no-pager -l
sudo systemctl status oneclaw-node --no-pager -l
echo ""
echo "🌐 Your OneClaw instance is available at: https://oneclaw.chat"
echo ""
echo "📝 Useful commands:"
echo "  - View harness logs: sudo journalctl -u oneclaw-harness -f"
echo "  - View node logs: sudo journalctl -u oneclaw-node -f"
echo "  - Restart harness: sudo systemctl restart oneclaw-harness"
echo "  - Restart node: sudo systemctl restart oneclaw-node"
echo ""
echo "⚠️  Next steps:"
echo "  1. Add 'https://oneclaw.chat/oauth/google/callback' to Google Cloud Console"
echo "  2. Test OAuth: https://oneclaw.chat/oauth/status"
echo "  3. Test health: https://oneclaw.chat/health"
