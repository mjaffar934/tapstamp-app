# NFC hardware → TapStamp loyalty upsell

Content & Growth brief + engineering hook notes. Claims must stay aligned with live product.

## What is real today

| Surface | Behaviour |
|--------|-----------|
| NFC shop | Google / Instagram NFC stands & epoxy — one-time Stripe purchase (`/reviews` or NFC host) |
| Programming | Merchant Google or Instagram URL; tap opens that link — **not** stamp loyalty |
| Loyalty order | `https://tapstamp.co/order` — owner account + free loyalty stamp; £0 software until 50 unique customers/month |
| Customer stamps | Loyalty chip `https://tapstamp.co/tap/{CODE}` → Apple Wallet; Google Wallet configured but not public yet |
| Owner app | TapStamp Expo — sign-in after web signup |

Do **not** claim: universal Google Wallet one-tap, Reviews NFC auto-stamping, or that Reviews and loyalty are the same SKU.

## Technical hooks

1. NFC checkout success shows **Start loyalty →** as the primary next step → `/order?from=nfc&plan=pro` (+ email / business_name / nfc_sku when known)
2. Order page banner when `from=nfc`; prefills email and business name
3. Loyalty Stripe Checkout metadata: `signup_source=nfc`, optional `nfc_sku`
4. Soft shop footer link to the same order URL

## CTA copy (shipped — CO-01…CO-09 from MJ-19 copy pack)

### NFC checkout success

- Eyebrow: Optional next step
- Headline: Add stamp loyalty
- Body: Your Instagram or Google NFC card opens a link. Stamp loyalty is separate: customers keep a card in Wallet, you stamp with one tap, and you can see visits instead of guessing from paper.
- Honesty: This is a separate signup — your NFC order already went through.
- Offer: Loyalty stamp included free. Software £0 until 50 unique customers in a month, then £25/mo. Card on file — £0 due today.
- Primary: Start loyalty → (`item_id=nfc_success_cta_v3`) → `/order?from=nfc&plan=pro`
- Secondary: See how it works → `/loyalty`

### `/order?from=nfc` banner

- You already bought an Instagram/Google NFC card — that order stands alone. This page starts stamp loyalty: Wallet cards for customers, one-tap stamps, visit tracking. Card on file, £0 today.

### NFC shop footer

- Want repeat visits, not just profile taps? Add wallet stamp loyalty. → `/order?from=nfc&plan=pro`

## Demo script (2 min)

1. Show NFC product → programmed URL for reviews/IG
2. Show success CTA → Start loyalty →
3. Land on `/order?from=nfc` banner
4. Demo Apple Wallet stamp path if available; do not promise Google for all Android users yet
5. Close on £0 until 50 unique/month for software

---

## Metrics (E4 / M1–M3)

**GA4 property:** `G-77R50KF8Q5` (NFC shop + loyalty `/order` pages share this ID).

### Canonical event names

| Event | Surface | Role | Key params |
|-------|---------|------|------------|
| `purchase` | NFC `/checkout/success` | **M1 denom** (paid NFC) | `transaction_id` = Stripe session; `start_loyalty` 0/1 |
| `nfc_success_view` | NFC success panel (once / session) | **M2 denom** | `content_type=loyalty_upsell`, `item_id=nfc_success_cta_v3` |
| `view_promotion` | NFC success (twin) | GA4 Explore helper | `promotion_id=loyalty_upsell`, `promotion_name=nfc_success_cta_v3` |
| `select_content` | Success CTA click | **M2 numerator** | `content_type=loyalty_upsell`, `item_id=nfc_success_cta_v3` |
| `nfc_loyalty_cta_click` | Success CTA / checkbox redirect | Easy Explore filter | `nfc_channel=success_cta` or `checkout_checkbox` |
| `nfc_success_skip` | “See how it works” | Soft drop-off | same content tags |
| `select_content` (`item_id=nfc_checkout_checkbox_redirect`) | Checkout checkbox path | Alternate M1 entry | redirects into `/order` |
| `nfc_loyalty_order_view` | `/order?from=nfc` | Mid-funnel | `nfc_channel`, optional `email_day` |
| `nfc_email_click` | `/order` when `email_day` set | **M3 land** | `email_day` ∈ {0,2,7} |
| `nfc_loyalty_signup_start` | Order form submit (`from=nfc`) | Intent | channel / day / sku |
| `nfc_loyalty_signup_complete` | `/order/success?from=nfc` | **M1 numer** (GA) | `signup_source=nfc` |

**E1 success CTA contract (stable ids):**

- `content_type` = `loyalty_upsell`
- `item_id` = `nfc_success_cta_v3` (live). Offer A / [MJ-14](/MJ/issues/MJ-14) planning text said `nfc_success_cta_v2` — treat **v3** as the shipped name after the copy pack.

### Definitions → how to compute

| Metric | Definition | Weekly method |
|--------|------------|---------------|
| **M1** Card→loyalty | NFC paid with later `signup_source=nfc` / NFC paid | Stripe CSV: `scripts/nfc-funnel-weekly.mjs` (join on email within 7d). GA cross-check: `nfc_loyalty_signup_complete` / `purchase`. Target ≥25% in 7d. |
| **M2** Success CTA CTR | CTA clicks / success views | GA4: `nfc_loyalty_cta_click` where `item_id=nfc_success_cta_v3` ÷ `nfc_success_view`. Target ≥40% on success panel. |
| **M3** Email→signup | Day-0/2/7 link → completed `/order` | Events wired now; emails pending E3. Deep link below. GA: completes with `email_day` ÷ `nfc_email_click`. Stripe: `nfc_email_day` metadata. |

### Email deep links (for Content / E3)

```
https://tapstamp.co/order?from=nfc&plan=pro&email_day=0&email={encodeURIComponent(email)}&business_name={…}&nfc_sku={…}&nfc_channel=email_day_0
```

Use `email_day=2` / `email_day=7` on later sends. Keep `from=nfc` so Stripe `signup_source` stays `nfc` for M1.

### Weekly export

```bash
# Summary to stdout
STRIPE_SECRET_KEY=sk_live_… DAYS=7 node scripts/nfc-funnel-weekly.mjs

# Session CSV (hardware paid + loyalty nfc rows)
STRIPE_SECRET_KEY=sk_live_… DAYS=7 CSV=1 node scripts/nfc-funnel-weekly.mjs > nfc-funnel-week.csv
```

GA4 Explore funnel: `nfc_success_view` → `nfc_loyalty_cta_click` → `nfc_loyalty_order_view` → `nfc_loyalty_signup_complete`.
