# Stripe setup (Phases 2 & 3)

## Products to create in Stripe

| Product | Price | Stripe env var |
|---------|-------|----------------|
| TapStamp NFC Kit | £35 one-time | `STRIPE_HARDWARE_PRICE_ID` |
| TapStamp Pro | £25/month recurring | `STRIPE_PRO_PRICE_ID` |
| TapStamp Multi-site | £59/month recurring | `STRIPE_MULTI_PRICE_ID` |

## Supabase secrets

Set **one secret per command** (avoids `Invalid secret pair` from blank lines or broken `\` continuations). Replace the `...` values with real IDs from Stripe Dashboard.

```bash
# You already have STRIPE_SECRET_KEY — only re-run if rotating keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY --project-ref biootanbxmqfserzgnxe

supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET --project-ref biootanbxmqfserzgnxe

supabase secrets set STRIPE_HARDWARE_PRICE_ID=price_YOUR_HARDWARE_ID --project-ref biootanbxmqfserzgnxe

supabase secrets set STRIPE_PRO_PRICE_ID=price_YOUR_PRO_ID --project-ref biootanbxmqfserzgnxe

supabase secrets set STRIPE_MULTI_PRICE_ID=price_YOUR_MULTI_ID --project-ref biootanbxmqfserzgnxe

supabase secrets set ORDER_WEBSITE_URL=https://tapstamp.co --project-ref biootanbxmqfserzgnxe
```

Verify:

```bash
supabase secrets list --project-ref biootanbxmqfserzgnxe
```

You should see all six `STRIPE_*` names plus `ORDER_WEBSITE_URL`.

## HTML & NFC

Customer tap and pass URLs are served directly by **Supabase edge functions**. See **`docs/HOSTING.md`** for custom domain setup (`api.tapstamp.co`) or free-tier fallbacks.

```bash
supabase secrets set FUNCTIONS_PUBLIC_URL=https://api.tapstamp.co --project-ref biootanbxmqfserzgnxe
```

App `.env`: `EXPO_PUBLIC_FUNCTIONS_URL=https://api.tapstamp.co` (or the raw `*.supabase.co` URL until custom domain is live)

## Webhook events

**URL:** `https://biootanbxmqfserzgnxe.supabase.co/functions/v1/stripe-webhook`

Enable these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed` (owner push: card declined)

## Stripe Customer Portal

Dashboard → Settings → Billing → Customer portal → **Activate**

Allow: update payment method, view invoices, cancel subscription (optional).

## Deploy

```bash
supabase functions deploy --project-ref biootanbxmqfserzgnxe
```

## Flow summary

| Phase | When | What |
|-------|------|------|
| 2 | Order | £35 hardware via Checkout; card saved for Pro/Multi |
| 3 | Go-live (chip link) | Pro/Multi: Stripe subscription with 14-day trial |
| 3 | Go-live | Starter: DB-only trial, free tier after |
| 3 | Trial ends | Pro/Multi: Stripe bills monthly; webhook syncs status |
| 3 | Payment fails | Cafe suspended; tap flow shows unavailable |
