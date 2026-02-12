# iClaw

**The easiest way to get an AI assistant on iMessage.**

Text. Setup. Done. No app download. No terminal commands. Just iMessage.

Built for iPhone users who want AI that *just works*.

> *Powered by [OpenClaw](https://github.com/openclaw/openclaw) under the hood.*

---

## For Users: Just Text

```
You:    Hey, I want an AI assistant

iClaw:  Hey! I'm iClaw 🦞
        
        What would you like help with?
        
        📧 Email - Read, summarize, send
        📅 Calendar - Check schedule, book meetings
        🏌️ Golf - Book tee times, snipe reservations
        🍕 Food - Order delivery, reservations
        
        Just tell me what you need!

You:    Email and golf

iClaw:  Great! Let's connect your email first.
        
        Tap to sign in with Google:
        https://iclaw.app/connect/gmail?u=abc123
        
        Come back here when done!

        [User taps, authenticates in browser]

iClaw:  ✅ Gmail connected!
        
        Now you can say things like:
        • "Read my latest emails"
        • "Book me a tee time Saturday morning"
        
        What would you like to do?
```

**That's it.** No app store. No passwords to remember. No settings to configure. Just text and go.

### Try It Now

Text **openclaw@icloud.com** to get started.

---

## For Developers: Self-Host

iClaw is fully open source. Run your own instance for yourself, your company, or your own SaaS.

### What is iClaw?

iClaw is the **conversational onboarding layer** for OpenClaw. It handles:

- **User onboarding via iMessage** - Guided setup through conversation
- **OAuth integrations** - Connect Gmail, Calendar, etc. via tap-to-auth links
- **User management** - Supabase for users, preferences, and tokens
- **Subscription billing** - Stripe integration for monetization
- **Skill activation** - Configure which OpenClaw skills each user has access to

OpenClaw handles the actual AI execution (browser automation, tool use, etc.). iClaw makes it accessible to normal people.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's iPhone                            │
│                     (Just texts iMessage)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ iMessage
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Mac Server (BlueBubbles)                                       │
│  • Receives iMessages                                           │
│  • Forwards to iClaw API                                        │
│  • Sends responses back                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Webhook
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  iClaw API                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Onboarding Engine                                        │  │
│  │  • Conversational setup flows                             │  │
│  │  • OAuth link generation                                  │  │
│  │  • User state management                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  OAuth Web App                                            │  │
│  │  • /connect/gmail, /connect/calendar, etc.               │  │
│  │  • Token storage                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Configures & Routes
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OpenClaw Gateway                                               │
│  • AI agent execution                                           │
│  • Browser automation                                           │
│  • Tool use (email, calendar, web, etc.)                       │
│  • 500+ skills via ClawHub                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Supabase │   │  Stripe  │   │  OAuth   │
        │ (Users)  │   │(Billing) │   │(Tokens)  │
        └──────────┘   └──────────┘   └──────────┘
```

### Quick Start

#### Prerequisites

- Node.js 22+
- pnpm
- Mac with BlueBubbles (for iMessage)
- OpenClaw installed (`npm install -g openclaw`)
- Supabase account
- Stripe account (optional, for billing)

#### Installation

```bash
# Clone the repo
git clone https://github.com/user/iclaw.git
cd iclaw

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

#### Configuration

```bash
cp .env.example .env.local
```

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# BlueBubbles
BLUEBUBBLES_URL=http://your-mac:1234
BLUEBUBBLES_PASSWORD=your-password

# OAuth (Google)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# OpenClaw
OPENCLAW_GATEWAY_URL=ws://localhost:18789
```

#### Run

```bash
# Terminal 1: Start OpenClaw gateway
openclaw gateway --port 18789

# Terminal 2: Start iClaw API
pnpm dev
```

#### BlueBubbles Setup

1. Install BlueBubbles on your Mac
2. Configure webhook: `http://your-server:3000/webhook/bluebubbles`
3. Users can now text your iMessage account

---

## Project Structure

```
iclaw/
├── apps/
│   ├── api/                    # Main API server (Hono)
│   │   └── src/
│   │       ├── routes/         # HTTP endpoints
│   │       │   ├── webhook.ts      # BlueBubbles webhook
│   │       │   └── oauth.ts        # OAuth callbacks
│   │       └── services/
│   │           ├── onboarding.ts   # Conversation flows
│   │           └── openclaw.ts     # OpenClaw integration
│   └── web/                    # OAuth callback pages
│
├── packages/
│   ├── core/                   # Shared types, utils
│   ├── database/               # Supabase client
│   ├── bluebubbles/            # iMessage bridge
│   └── onboarding/             # Conversation engine
│       └── SKILL.md            # OpenClaw-compatible skill
│
└── supabase/
    └── migrations/             # Database schema
```

---

## Contributing to OpenClaw

The `packages/onboarding` module is designed to be compatible with OpenClaw's skill format. It can be:

1. **Used standalone** with iClaw
2. **Installed as an OpenClaw skill** (`~/.openclaw/skills/onboarding/`)
3. **Published to ClawHub** for community use
4. **Contributed upstream** to OpenClaw core

We'd love to see conversational onboarding become a native OpenClaw feature. PRs welcome!

---

## Pricing (Hosted Service)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Try it out, 10 messages/day |
| Starter | $19/mo | Unlimited on-demand tasks |
| Pro | $49/mo | + Automated alerts, snipers, 24/7 monitoring |

Self-hosted is free forever. MIT licensed.

---

## Links

- **Try it:** Text `openclaw@icloud.com`
- **OpenClaw:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **ClawHub Skills:** [clawhub.com](https://clawhub.com)
- **Discord:** [discord.gg/iclaw](https://discord.gg/iclaw)

---

## License

MIT License - see [LICENSE](LICENSE) for details.
