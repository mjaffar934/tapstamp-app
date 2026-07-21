# Hosting — production

**Supabase project:** `biootanbxmqfserzgnxe`  
**Public customer domain:** `https://tapstamp.co` (Railway proxy + marketing site)  
**Owner app API:** `https://biootanbxmqfserzgnxe.supabase.co`

---

## Architecture

```
Customer NFC  →  https://tapstamp.co/tap/{CHIPCODE}
              →  Railway proxy  →  Supabase edge function `tap`
              →  /pass /google-wallet /wallet-strip /passkit-register

Owner app     →  Supabase Auth + Postgres (RLS) + edge functions
Marketing     →  Railway serves website/ at tapstamp.co
```

Program every NFC disc with:

`https://tapstamp.co/tap/CHIPCODE`

---

## Edge functions (customer)

| Path on tapstamp.co | Supabase function | Purpose |
|---------------------|-------------------|---------|
| `/tap/{code}` | `tap` | Join, stamp, restore, HTML |
| `/pass/{serial}` | `pass` | Apple `.pkpass` |
| `/google-wallet/{serial}` | `google-wallet` | Google Wallet save redirect |
| `/wallet/{serial}` | `wallet` | UA router → Apple or Google |
| `/wallet-strip/{serial}` | `wallet-strip` | Strip image for wallets |
| `/passkit-register/...` | `passkit-register` | Apple PassKit web service |

---

## Required Supabase secrets

```bash
supabase secrets set \
  FUNCTIONS_PUBLIC_URL=https://tapstamp.co \
  GOOGLE_WALLET_ORIGINS=https://tapstamp.co,https://biootanbxmqfserzgnxe.supabase.co \
  --project-ref biootanbxmqfserzgnxe
```

### Apple Wallet

`PASS_CERT`, `PASS_KEY`, `WWDR_CERT`, `PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APNS_PRODUCTION`

### Google Wallet

`GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT`, `GOOGLE_WALLET_PRIVATE_KEY`, `GOOGLE_WALLET_ORIGINS`

Optional after Google publishing access:

```bash
supabase secrets set GOOGLE_WALLET_REVIEW_STATUS=APPROVED --project-ref biootanbxmqfserzgnxe
```

Until then, leave unset (`underReview` / demo). Only Google Wallet Console test accounts can save passes.

See `docs/GOOGLE_WALLET.md` for tester setup and publishing access.

### Stripe / orders

`STRIPE_*`, `ORDER_WEBSITE_URL=https://tapstamp.co`

---

## Owner app `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://biootanbxmqfserzgnxe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_FUNCTIONS_URL=https://tapstamp.co
EXPO_PUBLIC_ORDER_WEBSITE_URL=https://tapstamp.co
```

Dev sign-in vars (`EXPO_PUBLIC_DEV_*`) are **development builds only** — do not ship them in production releases.

---

## Deploy

```bash
# Edge functions
supabase functions deploy --project-ref biootanbxmqfserzgnxe

# Railway (tapstamp.co) — push to connected repo or:
railway up
```

---

## Customer flow

1. Tap NFC → join or stamp HTML on `tapstamp.co`
2. Add to Wallet → Apple `/pass/{serial}` or Google `/google-wallet/{serial}`
3. Replace lost card → “I already have a card” → email → all cards for that email with Add to Wallet
4. Return tap → stamp / reward pages; Wallet updates via APNs / Google PATCH

---

## Local

```bash
npx expo start -c
cd railway && npm start   # http://localhost:3000
```
