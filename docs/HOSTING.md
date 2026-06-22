# Hosting (no Supabase Pro)

Three layers — each does one job.

## Architecture

```
tapstamp.co          →  Cloudflare Pages (website/)     marketing + order form
api.tapstamp.co      →  Railway (railway/)              HTML proxy + APNs push
biootanbxmqfserzgnxe →  Supabase                        database, auth, logic
```

| What | Where | Why |
|------|-------|-----|
| Homepage, pricing, order | **Cloudflare Pages** (`website/`) | Static HTML, free |
| Order API, Stripe, webhooks | **Supabase** `order-checkout` | JSON APIs work on `*.supabase.co` |
| NFC tap pages (HTML) | **Railway** proxies Supabase `tap` | Supabase blocks HTML on free URL without Pro |
| `.pkpass` generation | **Supabase** `pass` function (logic) | Built in Deno (`_shared/pkpass.ts`) |
| `.pkpass` download | **Railway** proxies `/pass/:serial` | Correct content-type for Wallet |
| Wallet silent push | **Railway** `@parse/node-apn` | Reliable Node APNs; Supabase tries Deno first, falls back to Railway |

**You do not need Supabase Pro.** Railway is a thin proxy (~100 lines), not a second backend.

---

## 1. Website — Cloudflare Pages

See previous steps: deploy `website/` folder, point `tapstamp.co` DNS.

Order form POSTs to Supabase `order-checkout` (JSON) — no Railway involved in orders.

---

## 2. Railway proxy — `api.tapstamp.co`

### Deploy

1. Railway → New project → Deploy from repo
2. **Root directory:** `railway`
3. **Start command:** `npm start`

### Environment variables

| Variable | Value |
|----------|-------|
| `SUPABASE_FUNCTIONS_URL` | `https://biootanbxmqfserzgnxe.supabase.co/functions/v1` |
| `PASS_CERT` | Apple Pass certificate PEM (same as Supabase) |
| `PASS_KEY` | Apple Pass private key PEM |
| `PASS_TYPE_ID` | `pass.com.tapstamp.loyalty` |
| `APNS_PRODUCTION` | `true` when live |

### Custom domain

Railway → Settings → Networking → `api.tapstamp.co`

DNS: `api` CNAME → Railway hostname

### Routes

| URL | Action |
|-----|--------|
| `GET /tap/CHIPCODE` | Proxy → Supabase tap, serve as HTML |
| `GET /pass/SERIAL` | Proxy → Supabase pass (.pkpass) |
| `GET /wallet/SERIAL` | Proxy → Supabase wallet redirect |
| `POST /push-update` | Silent APNs via node-apn |

**NFC chips encode:** `https://api.tapstamp.co/tap/CHIPCODE`

---

## 3. Supabase secrets

```bash
supabase secrets set RAILWAY_URL=https://api.tapstamp.co --project-ref biootanbxmqfserzgnxe
```

Supabase edge functions call Railway `/push-update` when Deno APNs fails or as fallback.

---

## 4. Owner app `.env`

```
EXPO_PUBLIC_FUNCTIONS_URL=https://api.tapstamp.co
```

Chip share URLs in the app will use `https://api.tapstamp.co/tap/CODE`.

---

## DNS summary

```
tapstamp.co       →  Cloudflare Pages
www.tapstamp.co   →  Cloudflare Pages
api.tapstamp.co   →  Railway (tap + pass + push)
```

---

## What stays on Supabase (no duplication)

- All database logic
- `tap` function (stamp, cooldown, Starter limits)
- `pkpass` building (`_shared/pkpass.ts`)
- Stripe checkout, webhooks, subscriptions
- Owner auth, provision-cafe, billing portal

Railway does **not** reimplement business logic — it fixes content-types and sends pushes.

---

## Local test

```bash
# Website
npx serve website -p 3000

# Railway proxy
cd railway && npm install
SUPABASE_FUNCTIONS_URL=https://biootanbxmqfserzgnxe.supabase.co/functions/v1 npm start
# Open http://localhost:3000/tap/YOURCHIPCODE
```
