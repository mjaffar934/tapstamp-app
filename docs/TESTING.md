# TapStamp — end-to-end testing checklist

Run after Stripe secrets are set and website changes are deployed.

## Prerequisites

- [ ] Stripe test mode keys in Supabase secrets (see `docs/STRIPE_SETUP.md`)
- [ ] Webhook endpoint configured with all subscription events
- [ ] Customer Portal activated in Stripe
- [ ] **Website deployed** from `website/` folder (see `docs/HOSTING.md`) — not Railway
- [ ] **Custom domain for NFC tap URLs** (optional until chips go live) — see `docs/STRIPE_SETUP.md`
- [ ] Expo app running (`npx expo start -c`)
- [ ] Test card: `4242 4242 4242 4242`

---

## Phase 1 — Funnel & app routing

### Order form
- [ ] Open `https://tapstamp.co/order?plan=starter` — page **renders** (not raw HTML source)
- [ ] Plan picker shows Starter / Pro / Multi
- [ ] Price box shows £35 due today
- [ ] Submit without address → validation error

### Starter order (full)
- [ ] Submit complete form → redirects to Stripe
- [ ] Pay with test card → success page with email reminder
- [ ] Success page says trial starts at go-live

### App — payment pending
- [ ] Sign in before paying (if you abandoned checkout) → **Complete your order** screen
- [ ] **Pay with Stripe** opens checkout

### App — waiting room
- [ ] Sign in after paid order → **Your stamp is on the way**
- [ ] **I've received my kit** → setup welcome

### Onboarding
- [ ] Complete 5 steps → link NFC chip
- [ ] Done screen → dashboard

---

## Phase 2 — Hardware payment

- [ ] New Pro order → Stripe shows £35
- [ ] After payment `businesses.order_status` = `paid`
- [ ] `stripe_customer_id` populated in database
- [ ] Abandon checkout → can resume from app or re-submit form with same email

---

## Phase 3 — Subscriptions at go-live

### Starter
- [ ] Order Starter plan, pay, complete onboarding
- [ ] After chip link: `trial_ends_at` set ~14 days out
- [ ] Dashboard shows trial banner
- [ ] After trial (or simulate past `trial_ends_at`): usage meter shows X/50 customers
- [ ] 51st new customer blocked on tap; existing customers can still stamp

### Pro
- [ ] Order Pro plan, pay (card saved)
- [ ] Link chip → Stripe subscription created with 14-day trial
- [ ] `stripe_subscription_id` populated
- [ ] Dashboard trial banner shows £25/mo after trial
- [ ] **Manage billing in Stripe** opens Customer Portal

### Multi-site
- [ ] Same as Pro but £59/mo price ID

### Suspension (Pro/Multi)
- [ ] In Stripe test mode, end trial without valid payment OR cancel subscription
- [ ] Webhook fires → cafe `status` = suspended
- [ ] Customer tap shows programme unavailable

---

## Staff mode

- [ ] Owner sees staff code in Settings
- [ ] Staff sign-in with code → barista mode works
- [ ] Stamp / redeem actions work

---

## Auth

- [ ] Login with order email + password
- [ ] Forgot password flow
- [ ] Sign out returns to gate

---

## Regression

- [ ] `npx tsc --noEmit` passes
- [ ] Existing workshop accounts still reach dashboard

---

## Stripe Dashboard checks

After each test order:
- [ ] Customer created
- [ ] £35 payment succeeded
- [ ] Pro/Multi: subscription in **Trialing** after go-live
