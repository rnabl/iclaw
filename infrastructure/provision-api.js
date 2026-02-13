// Provision API for iClaw multi-tenant OpenClaw
// Runs on the Droplet, handles user provisioning and OAuth token injection

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

const SECRET = process.env.PROVISION_SECRET || 'iclaw-provision-2026';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Track ports - start at 18001
let nextPort = 18001;

// Load existing users to find next available port
try {
  const usersDir = '/opt/iclaw/users';
  if (fs.existsSync(usersDir)) {
    const users = fs.readdirSync(usersDir);
    users.forEach(user => {
      const configPath = `${usersDir}/${user}/data/openclaw.json`;
      if (fs.existsSync(configPath)) {
        nextPort = Math.max(nextPort, 18001 + users.length);
      }
    });
  }
} catch (e) {
  console.log('No existing users found, starting at port 18001');
}

/**
 * POST /provision
 * Create a new OpenClaw instance for a user
 */
app.post('/provision', (req, res) => {
  const { phone, port, secret } = req.body;
  
  if (secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = phone.replace('+', '');
  const userDir = `/opt/iclaw/users/${userId}`;
  const assignedPort = port || nextPort++;
  const token = crypto.randomBytes(24).toString('hex');
  
  // Create directories
  fs.mkdirSync(`${userDir}/data`, { recursive: true });
  fs.mkdirSync(`${userDir}/workspace`, { recursive: true });
  
  // Create OpenClaw config
  const config = {
    model: { 
      provider: "anthropic", 
      model: "claude-sonnet-4-20250514" 
    },
    agent: { 
      systemPrompt: "You are a helpful AI assistant accessible via iMessage. Keep responses concise and conversational. No markdown formatting - just plain text with emojis. Be friendly but brief." 
    },
    gateway: {
      port: 18789,
      auth: { mode: "token", token: token },
      http: { 
        endpoints: { 
          chatCompletions: { enabled: true } 
        } 
      }
    }
  };
  
  fs.writeFileSync(`${userDir}/data/openclaw.json`, JSON.stringify(config, null, 2));
  
  // Create docker-compose for this user
  const dockerCompose = `
version: '3.8'
services:
  openclaw:
    image: node:22-slim
    container_name: openclaw-${userId}
    restart: unless-stopped
    ports:
      - "${assignedPort}:18789"
    volumes:
      - ${userDir}/data:/root/.openclaw
      - ${userDir}/workspace:/workspace
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    working_dir: /root
    command: >
      sh -c "npm install -g @anthropic-ai/openclaw && openclaw gateway start"
`;
  
  fs.writeFileSync(`${userDir}/docker-compose.yml`, dockerCompose);
  
  // Start the container
  exec(`cd ${userDir} && docker-compose up -d`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error starting container for ${phone}:`, stderr);
      // Still return success - config is created, container can be started later
    } else {
      console.log(`Container started for ${phone} on port ${assignedPort}`);
    }
  });
  
  console.log(`Provisioned user ${phone} on port ${assignedPort}`);
  res.json({ success: true, userId, port: assignedPort, token });
});

/**
 * POST /oauth
 * Inject OAuth tokens into a user's OpenClaw instance
 */
app.post('/oauth', (req, res) => {
  const { phone, provider, tokens, secret } = req.body;
  
  if (secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = phone.replace('+', '');
  const userDir = `/opt/iclaw/users/${userId}`;
  const authProfilesPath = `${userDir}/data/agents/default/agent/auth-profiles.json`;
  
  // Ensure directory exists
  fs.mkdirSync(`${userDir}/data/agents/default/agent`, { recursive: true });
  
  // Load or create auth profiles
  let authProfiles = {};
  if (fs.existsSync(authProfilesPath)) {
    try {
      authProfiles = JSON.parse(fs.readFileSync(authProfilesPath, 'utf8'));
    } catch (e) {
      authProfiles = {};
    }
  }
  
  // Add/update the provider tokens
  authProfiles[provider] = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    provider: provider,
  };
  
  fs.writeFileSync(authProfilesPath, JSON.stringify(authProfiles, null, 2));
  
  console.log(`Saved ${provider} tokens for user ${phone}`);
  res.json({ success: true, provider });
});

/**
 * POST /deprovision
 * Remove a user's OpenClaw instance
 */
app.post('/deprovision', (req, res) => {
  const { phone, secret } = req.body;
  
  if (secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = phone.replace('+', '');
  const userDir = `/opt/iclaw/users/${userId}`;
  
  // Stop and remove container
  exec(`cd ${userDir} && docker-compose down`, (err) => {
    if (err) {
      console.error(`Error stopping container for ${phone}`);
    }
    
    // Remove user directory
    fs.rmSync(userDir, { recursive: true, force: true });
    
    console.log(`Deprovisioned user ${phone}`);
    res.json({ success: true });
  });
});

/**
 * GET /status/:phone
 * Check if a user's instance is running
 */
app.get('/status/:phone', (req, res) => {
  const userId = req.params.phone.replace('+', '');
  const userDir = `/opt/iclaw/users/${userId}`;
  
  if (!fs.existsSync(userDir)) {
    return res.json({ exists: false, running: false });
  }
  
  exec(`docker ps --filter name=openclaw-${userId} --format "{{.Status}}"`, (err, stdout) => {
    res.json({ 
      exists: true, 
      running: stdout.includes('Up'),
      status: stdout.trim() || 'stopped'
    });
  });
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => console.log(`Provision API running on :${PORT}`));
