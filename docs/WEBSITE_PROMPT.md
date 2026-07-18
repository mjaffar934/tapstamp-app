# Website implementation prompt (copy everything below into Claude)

---

You are updating the marketing website for **TapStamp** at **https://tapstamp.co/**.

The backend order funnel, Stripe checkout, and owner app are already built. Your job is to update the **tapstamp.co website** so it matches the product funnel exactly.

## No Railway — static site only

**Hosting:** Railway (`railway/server.js` + `website/`). Order checkout still hits Supabase `order-checkout`.

| Layer | Host |
|-------|------|
| Marketing pages + order form | **Static host** (Vercel, Cloudflare Pages, Netlify, etc.) |
| Checkout + accounts + Stripe | **Supabase Edge Functions** (`order-checkout`) |
| Owner app | Expo (separate) |

The order form talks **directly** to Supabase from the browser (HTML form POST or `fetch`). Stripe redirects back to `tapstamp.co/order/success`.

Detect the site's stack from the repo (Next.js static export, Astro, plain HTML, etc.) and keep it **serverless/static**.

## Brand (match exactly)

- **Background:** `#FAF8F5` (warm cream)
- **Text:** `#1A1814` (near black)
- **Muted text:** `#8A8070`
- **Accent / gold:** `#C9A96E`
- **Accent dark:** `#A68B4B`
- **Font:** system-ui / Inter / -apple-system
- **Tone:** Premium, minimal, independent coffee shops / London businesses

## Critical URLs

| Purpose | URL |
|---------|-----|
| Order form (host on website) | `https://tapstamp.co/order?plan=starter\|pro\|multi` |
| Order success (host on website) | `https://tapstamp.co/order/success?session_id=…` |
| Checkout API (POST only — no HTML) | `https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout` |
| Starter order | `https://tapstamp.co/order?plan=starter` |
| Pro order | `https://tapstamp.co/order?plan=pro` |
| Multi-site order | `https://tapstamp.co/order?plan=multi` |
| Marketing home | `https://tapstamp.co/` |
| Contact | `hello@tapstamp.co` |

> **Why not host the form on Supabase?** Supabase rewrites HTML to `text/plain` on `*.supabase.co`. The order form must live on tapstamp.co. The backend API handles account creation and Stripe redirect.

## `/order` page (REQUIRED — host the full form)

Build `tapstamp.co/order` as a real page (not a redirect). Match the brand colours from this prompt. The form POSTs to the checkout API.

**Checkout API:** `https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout`

### Form fields

- Plan picker: `starter` / `pro` / `multi` (radio, default from `?plan=` query)
- Price box: £35 due today; show monthly after trial for Pro/Multi
- `owner_name`, `business_name`, `email`, `password` (min 8)
- `shipping_address_line1`, `city`, `postcode`, `shipping_phone` (optional)

### Submit behaviour

**Option A — HTML form POST** (simplest, no CORS):

```html
<form method="POST" action="https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout">
  <!-- fields -->
</form>
```

On success the API returns a 303 redirect to Stripe Checkout. On error it redirects back to `/order?plan=…&error=…`.

**Option B — JavaScript fetch** (same-origin page, better inline errors):

```javascript
const res = await fetch('https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan, owner_name, business_name, email, password, shipping_address_line1, city, postcode, shipping_phone }),
});
const data = await res.json();
if (data.checkoutUrl) window.location.href = data.checkoutUrl;
```

**Delete** any existing `/order/create` route or Railway proxy — it is replaced by the Supabase URL above.

### Query params to handle on `/order`

| Param | Meaning |
|-------|---------|
| `plan` | Pre-select plan (`starter`, `pro`, `multi`) |
| `error` | Show error banner (URL-decoded message from API) |
| `canceled=1` | User closed Stripe — show “payment not completed” copy and let them retry |

### `/order/success` page (REQUIRED)

Stripe redirects here after payment: `/order/success?session_id={CHECKOUT_SESSION_ID}`

On load, fetch fulfillment data and render the success screen:

```javascript
const params = new URLSearchParams(location.search);
const sessionId = params.get('session_id');
const api = 'https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout';

fetch(api + '?success=1&session_id=' + encodeURIComponent(sessionId))
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (!data.ok) { /* show error + link back to /order */ return; }
    /* render success: email, plan name, next steps, trial-at-go-live copy */
  });
```

Success copy must include:
- Payment received, kit shipping in 48 hours
- Login email shown clearly
- 14-day trial starts at go-live (NFC link), not today
- Starter: free forever after trial, 50 customers/month
- Pro/Multi: monthly price after trial
- Link back to tapstamp.co

---

## Pricing — three plans only (remove Growth tier, remove founding offer if present)

### Starter
- **Kit:** £35 one-time (NFC stamp posted to you)
- **Software:** Free forever after 14-day trial
- **Limit:** 50 unique customers per month (resets monthly)
- **CTA:** `/order?plan=starter`
- **Subline:** "Free after trial — up to 50 customers per month"

### Pro (mark as "Most popular")
- **Kit:** £35 one-time
- **Software:** £25/month after 14-day trial
- **CTA:** `/order?plan=pro`
- **Subline:** "Unlimited customers — £25/mo after trial"

### Multi-site
- **Kit:** £35 one-time
- **Software:** £59/month after 14-day trial (NOT £49)
- **CTA:** `/order?plan=multi`
- **Subline:** "Up to 5 locations — £59/mo after trial"

### Pricing footnote (below all cards)

> **Today:** £35 for your handcrafted NFC stamp kit.
> **Trial:** Your 14-day free software trial starts when you go live in the owner app (when you link your NFC stamp) — not at checkout.
> **Starter after trial:** Free forever, up to 50 unique customers per month.
> **Pro / Multi after trial:** Billed monthly via Stripe.

---

## Copy changes (fix contradictions)

### REMOVE or REPLACE these incorrect lines:
- ❌ "No hardware to buy" → ✅ "One handcrafted stamp, posted to you for £35"
- ❌ "14-day free trial included" (implies trial starts at order) → ✅ "14-day free trial from go-live"
- ❌ "Start free" without mentioning £35 kit → ✅ "£35 kit + free software (Starter)"
- ❌ Multi-site £49 → ✅ £59
- ❌ "50 loyalty cards" → ✅ "50 unique customers per month"
- ❌ Any `tapstamp.com` links → ✅ `tapstamp.co`

### Hero section
Keep: *"The loyalty stamp your customers actually use"*
Eyebrow: *"Digital loyalty · No app needed"* (for **customers** — they use Apple/Google Wallet, not an app)

### How it works — rewrite to 4 steps

1. **Order on tapstamp.co** — Pick Starter, Pro, or Multi-site. Pay £35 for your NFC kit and create your owner account.
2. **Kit arrives** — We post within 48 hours. Sign in to the TapStamp owner app when it's ready.
3. **Go live** — Customise your card and tap your NFC sticker to link it. Your 14-day trial starts now.
4. **Customers tap** — They add their card to Apple Wallet or Google Wallet. No customer app required.

---

## Navigation & CTAs

| Button / link | Destination | Notes |
|---------------|-------------|-------|
| "Order your stamp" (hero) | `/order?plan=starter` | Primary CTA |
| "Get started" (header) | `/order?plan=starter` | Same |
| Starter pricing CTA | `/order?plan=starter` | |
| Pro pricing CTA | `/order?plan=pro` | |
| Multi pricing CTA | `/order?plan=multi` | |
| **Sign in** (header) | Owner app section (see below) | **NOT** the order form |
| "Already have an account" (footer CTA) | Owner app section | |

### Sign in / Owner app (no App Store yet)

Until App Store links exist, use a modal or `/app` page:

**Title:** Owner app  
**Body:** The TapStamp owner app is rolling out to new customers. If you already ordered, we'll email you at your order address when it's ready to download. Use the same email and password you created when ordering.

**Do not** link Sign in to the order form.

---

## FAQ section (add if missing)

**When am I charged for software?**  
14 days after you go live in the owner app — when you link your NFC stamp. The £35 kit is paid at order.

**What counts as a customer on Starter?**  
A unique person who receives at least one stamp in a calendar month. Same person stamping 5 times = 1 customer. Same person in January and February = 1 each month.

**Do my customers need an app?**  
No. They tap your stamp and add a card to Apple Wallet or Google Wallet.

**What's the difference between plans?**  
Starter is free after trial with a 50 customer/month cap. Pro is unlimited for £25/mo. Multi-site supports multiple locations for £59/mo.

---

## Features grid — keep but align

- Handcrafted NFC stamp (£35 kit)
- No app for customers (Wallet only)
- Apple Wallet + Google Wallet
- Push campaigns
- Real analytics
- Custom branding
- 14-day trial from go-live

---

## Deliverables

1. Updated pricing section with correct prices and CTAs
2. `/order` form page (POST to checkout API)
3. `/order/success` page (fetch fulfillment, show next steps)
4. Fixed "How it works" copy
4. Sign in → owner app messaging (not order form)
5. FAQ section
6. All order CTAs point to `/order?plan=...`
7. Remove contradictory copy
8. Match brand colours and typography

Output the full file changes needed for the website repo. If you need to know the framework, ask once — otherwise infer from the codebase.

---
