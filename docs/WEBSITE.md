# tapstamp.co — website implementation checklist

This doc lists what to change on [tapstamp.co](https://tapstamp.co/) so the marketing site matches the app and order funnel.

## Order flow URL

All “Order your stamp” / “Get started” buttons should link to:

```
https://tapstamp.co/order?plan=STARTER
https://tapstamp.co/order?plan=pro
https://tapstamp.co/order?plan=multi
```

Create **`/order`** on tapstamp.co as a **static page** (no backend). See `docs/WEBSITE_PROMPT.md`.

**Remove Railway** — delete `/order/create` and any Express server. The form POSTs directly to Supabase:

```
https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout
```

Host the site on Vercel, Cloudflare Pages, or Netlify (static only).

Success page at **`/order/success`** — Stripe redirects here after payment.

## Pricing section — three plans only

| Plan | Hardware | Software | CTA |
|------|----------|----------|-----|
| **Starter** | £35 kit | Free forever after 14-day trial | `/order?plan=starter` |
| **Pro** | £35 kit | £25/mo after 14-day trial | `/order?plan=pro` |
| **Multi-site** | £35 kit | £59/mo after 14-day trial | `/order?plan=multi` |

### Copy to use

**Starter**
- “£35 for your NFC stamp kit”
- “14-day free trial from go-live”
- “Free forever after trial — up to 50 unique customers per month”
- Remove “14-day free trial included” if it implies trial starts at order

**Pro** (Most popular)
- “£35 kit + £25/month after trial”
- “Unlimited loyalty cards”
- “14-day free trial starts when you go live in the app”

**Multi-site**
- “£35 kit + £59/month after trial”
- “Up to 5 locations, combined dashboard”

### Global pricing note (below cards)

> **Today:** £35 for your handcrafted NFC stamp kit.  
> **Trial:** 14-day free software trial starts when you link your stamp in the owner app — not at checkout.  
> **Starter after trial:** Free forever, 50 unique customers per month (resets monthly).  
> **Pro / Multi after trial:** Billed monthly.

## Header navigation

| Link | Destination |
|------|-------------|
| Sign in | Owner app — for now: “Download coming soon” or TestFlight link when ready. Do **not** link to the order form. |
| Get started | `/order?plan=starter` |
| Order your stamp (hero) | `/order?plan=starter` |

## Remove / update

- [ ] Remove **Growth** tier if present
- [ ] Change all `tapstamp.com` → `tapstamp.co`
- [ ] Remove copy that says trial starts at order
- [ ] “No hardware to buy” in How it works — **contradicts £35 kit**. Change to: “One handcrafted stamp, posted to you”

## How it works — align with app

1. **Order on tapstamp.co** — pick a plan, pay £35 for kit, create owner account  
2. **Kit arrives** — sign in to owner app, customise card  
3. **Tap sticker to go live** — 14-day trial starts  
4. **Customers tap** — Apple Wallet / Google Wallet, no customer app  

## Sign in (until App Store)

Owner app is not on the App Store yet. Options:

1. **“Owner app — coming soon”** with email capture: “We'll notify you at order confirmation email”
2. **TestFlight link** when ready (iOS only)
3. Do not promise App Store / Play Store buttons until links exist

## Stripe (Phase 2 — live)

Order form redirects to **Stripe Checkout** for the £35 hardware kit after account creation.

- Form → Stripe → success page
- App shows **Complete your order** if payment was abandoned (`pending_payment`)
- Setup: see `docs/STRIPE_SETUP.md` in the app repo

Until Stripe secrets are configured, orders will fail at checkout with a server error.

## Contact

- Billing / upgrade: `hello@tapstamp.co`
- Support: same

## FAQ snippets (optional page)

**When am I charged for software?**  
14 days after you go live in the owner app (when you link your NFC stamp). Hardware (£35) is paid at order.

**What counts as a customer on Starter?**  
A unique person who receives at least least one stamp in a calendar month. Same person stamping 5 times = 1 customer. Same person in January and February = 1 each month.

**Do my customers need an app?**  
No. They tap your stamp and add a card to Apple Wallet or Google Wallet.
