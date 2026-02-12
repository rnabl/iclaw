# iClaw - Product Requirements Document

## Overview

iClaw is a managed OpenClaw deployment for iPhone users. Users text an iCloud address and get a personal AI assistant that can book golf, order food, manage calendars, read emails, and more - all via iMessage.

**What iClaw IS:** A wrapper around OpenClaw with payments and multi-user support.
**What iClaw IS NOT:** A custom-built AI assistant (OpenClaw handles that).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Mac VPS (HostMyApple $25/mo)                               │
│                                                             │
│  ┌────────────────┐      ┌────────────────────────────────┐ │
│  │  BlueBubbles   │ ───► │  OpenClaw Gateway              │ │
│  │  (iMessage)    │      │                                │ │
│  └────────────────┘      │  • AI (Claude)                 │ │
│                          │  • Gmail / Calendar            │ │
│                          │  • Browser automation          │ │
│                          │  • Crons (Pro only)            │ │
│                          │  • Session per phone number    │ │
│                          └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (Free tier)                                       │
│  ├── users (phone_number, tier, stripe_customer_id)         │
│  └── usage (action tracking for overages)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Stripe                                                     │
│  ├── Starter: $19/mo                                        │
│  ├── Pro: $49/mo                                            │
│  └── Webhook → Supabase (updates user tier)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | $19/mo | On-demand tasks (you ask, it does) |
| **Pro** | $49/mo | Everything + automated tasks (crons, snipers) |

Both tiers:
- Unlimited AI conversations
- Book golf, order food, make reservations
- Gmail & Calendar access
- Connect accounts (Starbucks, Pizza Hut, etc.)

Pro exclusive:
- Sniper alerts (golf tee times, restaurant openings)
- Automated daily/weekly tasks
- Priority booking

Overages:
- Heavy usage may incur small overage (billed monthly)
- Most users won't hit this
- Displayed as: "Overage may apply*"

---

## Tech Stack

| Component | Tool | Cost |
|-----------|------|------|
| AI + Skills | OpenClaw | Free (self-hosted) |
| iMessage Bridge | BlueBubbles | Free |
| Mac Hosting | HostMyApple | $25/mo |
| Database | Supabase | Free tier |
| Payments | Stripe | 2.9% + $0.30 per txn |
| AI Model | Claude API | ~$0.01-0.05 per message |

**Total infrastructure cost: ~$25-50/mo**

---

## Database Schema (Supabase)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'none',  -- 'none', 'starter', 'pro'
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking (for overages)
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    action TEXT NOT NULL,
    billing_period TEXT NOT NULL,  -- '2026-02'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_usage_period ON usage(phone_number, billing_period);
```

---

## Stripe Setup

### Products

```
1. iClaw Starter
   - Price: $19/mo
   - Billing: Monthly recurring
   
2. iClaw Pro
   - Price: $49/mo
   - Billing: Monthly recurring
```

### Webhook Events

```
customer.subscription.created → Set user tier
customer.subscription.updated → Update user tier
customer.subscription.deleted → Set tier to 'none'
invoice.payment_failed → Handle failed payment
```

---

## User Flows

### New User → Subscription

```
1. User texts iopenclaw@icloud.com
2. OpenClaw receives via BlueBubbles
3. iClaw skill checks Supabase → No user found
4. Create user record with tier='none'
5. Send onboarding message
6. User replies "Starter" or "Pro"
7. Send Stripe checkout link
8. User pays via Apple Pay
9. Stripe webhook fires → Update tier in Supabase
10. iClaw skill detects tier change
11. Welcome message + first action prompt
```

### Existing User → Normal Use

```
1. User texts "Book me golf Saturday 8am"
2. OpenClaw receives message
3. iClaw skill checks Supabase → tier='starter'
4. Route to appropriate OpenClaw capability
5. OpenClaw browser tool books tee time
6. Confirm to user
7. Log usage to Supabase
```

### Starter User → Pro Upsell

```
1. User texts "Set up a sniper for Torrey Pines"
2. iClaw skill checks tier → 'starter'
3. "Snipers are Pro only. Upgrade?"
4. User says yes
5. Send Pro upgrade link
6. User upgrades
7. Webhook updates tier
8. Proceed with sniper setup
```

---

## BlueBubbles Configuration

```
Server URL: https://labs-redeem-attach-visit.trycloudflare.com
Local Port: 1234
iMessage Email: iopenclaw@icloud.com
```

---

## Setup Checklist

### Phase 1: Mac + OpenClaw
- [x] HostMyApple Mac provisioned
- [x] NoMachine access working
- [x] iCloud account created (iopenclaw@icloud.com)
- [x] Signed into iCloud on Mac
- [x] BlueBubbles installed
- [x] BlueBubbles permissions granted
- [x] iMessage working (test from personal phone)
- [ ] OpenClaw installed
- [ ] OpenClaw configured for BlueBubbles
- [ ] OpenClaw gateway running
- [ ] End-to-end test: Text → Response

### Phase 2: Supabase
- [ ] Supabase project created
- [ ] Users table created
- [ ] Usage table created
- [ ] Anon key and URL noted

### Phase 3: Stripe
- [ ] Stripe account
- [ ] Starter product ($19/mo)
- [ ] Pro product ($49/mo)
- [ ] Payment Links generated
- [ ] Webhook endpoint configured
- [ ] Webhook secret noted

### Phase 4: Integration
- [ ] Stripe webhook Edge Function deployed
- [ ] Webhook tested (creates/updates user tier)
- [ ] iClaw skill created
- [ ] Skill queries Supabase correctly
- [ ] Onboarding flow works
- [ ] Payment → Tier update works
- [ ] Feature gating works

### Phase 5: Polish
- [ ] Error handling
- [ ] Usage tracking
- [ ] Test all user flows
- [ ] Document operational procedures

---

## Success Metrics

- **Onboarding conversion**: First text → Paid subscriber
- **Time to value**: First text → First completed action
- **Weekly active**: Users who message at least 1x/week
- **Actions per user**: Bookings, orders, etc. per month
- **Churn**: Monthly subscription cancellations
- **Upgrade rate**: Starter → Pro conversions
