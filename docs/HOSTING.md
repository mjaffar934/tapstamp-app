# Hosting — Supabase only

Everything that **runs logic** lives on one Supabase project:

**Project:** `biootanbxmqfserzgnxe`  
**Base URL:** `https://biootanbxmqfserzgnxe.supabase.co`

---

## The whole system in one diagram

```
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (biootanbxmqfserzgnxe)                            │
│                                                             │
│  Postgres     Auth        Storage        Edge Functions     │
│  ────────     ────        ───────        ──────────────     │
│  cafes        owner       logos          tap          ← NFC │
│  passes       login                        pass       ← .pkpass
│  stamps                                  wallet     ← iOS/Android
│  chips                                   barista-action     │
│  businesses                              provision-cafe     │
│                                          stripe-webhook     │
│                                          order-checkout     │
│                                          … (31 functions)   │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
   Owner app            Customer phone         Stripe
   (Expo)               (Safari + Wallet)
```

**No Railway. No Cloudflare Worker. No second backend.**

---

## Two URLs you need to know

| Who | URL |
|-----|-----|
| **Owner app** | `EXPO_PUBLIC_SUPABASE_URL` → `https://biootanbxmqfserzgnxe.supabase.co` |
| **NFC chip / customer tap** | `https://biootanbxmqfserzgnxe.supabase.co/functions/v1/tap/CHIPCODE` |

That's it. Program every NFC disc with that tap URL pattern.

---

## What each customer-facing edge function does

| Function | URL | Purpose |
|----------|-----|---------|
| `tap` | `/functions/v1/tap/{code}` | NFC entry — stamp or create pass (HTML pages) |
| `wallet` | `/functions/v1/wallet/{serial}` | Send iPhone → Apple, Android → Google |
| `pass` | `/functions/v1/pass/{serial}` | Download signed `.pkpass` |
| `google-wallet` | `/functions/v1/google-wallet/{serial}` | Google Wallet save link |
| `save-customer` | `/functions/v1/save-customer` | Save name/email after join form |

---

## Owner app `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://biootanbxmqfserzgnxe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_FUNCTIONS_URL=https://biootanbxmqfserzgnxe.supabase.co
```

`EXPO_PUBLIC_FUNCTIONS_URL` should match `EXPO_PUBLIC_SUPABASE_URL`.

---

## Supabase secrets (edge functions)

```bash
supabase secrets set FUNCTIONS_PUBLIC_URL=https://biootanbxmqfserzgnxe.supabase.co --project-ref biootanbxmqfserzgnxe
```

Plus wallet signing (`PASS_CERT`, `PASS_KEY`, `WWDR_CERT`, `APPLE_TEAM_ID`), Stripe keys, etc.

---

## Deploy functions

```bash
supabase functions deploy --project-ref biootanbxmqfserzgnxe
```

---

## Marketing website (`tapstamp.co`)

The static site in `website/` is **not** part of the backend. It's just HTML/CSS on Cloudflare Pages. The order form calls Supabase `order-checkout` directly. You can ignore it when thinking about the customer tap flow.

---

## Customer flow (Supabase only)

1. **Tap NFC** → `GET /functions/v1/tap/TS0007`
2. **First visit** → creates `passes` row → welcome HTML → “Add to Wallet”
3. **Add to Wallet** → `GET /functions/v1/wallet/{serial}` → `GET /functions/v1/pass/{serial}` → `.pkpass`
4. **Return tap** → reads cookie → stamps pass → “Stamped!” HTML
5. **Owner redeems** → owner app → `barista-action` edge function

All reads/writes hit Supabase Postgres. All customer pages hit Supabase edge functions.

---

## If tap pages show raw HTML on your phone

Supabase sometimes serves HTML as `text/plain` on the free `*.supabase.co` hostname.

**Recommended:** Cloudflare Worker in `workers/tap-proxy/` — route `tapstamp.co/tap/*` (and wallet/pass paths) through the worker. It proxies to the same Supabase functions and fixes `Content-Type`. Program NFC chips with:

`https://tapstamp.co/tap/CHIPCODE`

Then set:

```bash
supabase secrets set FUNCTIONS_PUBLIC_URL=https://tapstamp.co --project-ref biootanbxmqfserzgnxe
```

**Alternative:** Supabase custom domain (Pro + $10/mo) — e.g. `api.tapstamp.co` pointing at edge functions.

---

## Local dev

```bash
npx expo start -c          # owner app
supabase functions serve   # edge functions (needs Docker)
```

Test tap: `http://127.0.0.1:54321/functions/v1/tap/YOURCODE`
