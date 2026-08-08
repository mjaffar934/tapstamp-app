# Customer NFC tap flow

Branded HTML on the customer’s phone → Apple / Google Wallet → return taps show stamp progress.

**Production URL (custom domain):** `https://tapstamp.co/tap/{CHIPCODE}`  
**Direct Supabase (dev):** `https://biootanbxmqfserzgnxe.supabase.co/functions/v1/tap/{CHIPCODE}`

Use the custom domain on NFC chips so HTML renders correctly on iPhone (see `docs/HOSTING.md`).

---

## Flow

```
Tap NFC
  │
  ├─ collect_customer_details ON  → join form (name / email)
  │                                 → Continue → welcome page
  │
  └─ collect_customer_details OFF → welcome page directly
        │
        ▼
  Welcome — cafe branding, stamp dots, reward progress
  "Add to Apple Wallet" / "Add to Google Wallet"
        │
        ▼
  wallet/{serial} → pass/{serial} (.pkpass) or google-wallet/{serial}
        │
        ▼
  Customer taps "I've added my card" → ?thanks=1
        │
        ▼
  Thanks for joining — keep tapping to collect stamps

Return tap (cookie remembers pass)
        │
        ▼
  Stamp added — "X stamps until {reward}"
  Wallet pass updates via PassKit web service
```

---

## Pages

| Step | Query / path | What the customer sees |
|------|----------------|-------------------------|
| First tap | `/tap/{code}` | Form (if enabled) or welcome |
| After form | `/tap/{code}?welcome=1` | Welcome + wallet buttons |
| After wallet | `/tap/{code}?thanks=1` | Thanks for joining |
| Return visit | `/tap/{code}` | Stamp added + progress |
| Cooldown | `/tap/{code}` | Already stamped — come back in N hours |
| Restore | `/tap/{code}?restore=1` | Email lookup for lost card |

All pages use the cafe’s `background_color`, `foreground_color`, and logo from settings.

---

## Wallet pass

- No QR code on the pass (clean store-card layout)
- Strip image shows filled / empty stamp dots
- Stamp count in primary field; reward in auxiliary field
- Updates automatically when customer taps again or barista redeems

---

## Owner settings that affect this flow

| Setting | Effect |
|---------|--------|
| `collect_customer_details` | Show join form before welcome |
| `collect_birthday` | Extra birthday field on form |
| `welcome_message` | Custom text on welcome page |
| `stamp_message` | Headline on return-tap stamp page |
| `minimum_spend` | Confirm spend before stamping |
| Brand colours + logo | HTML pages and wallet pass |

---

## Wallet sync trust (merchant + customer)

Stamp count in Supabase (`passes.stamp_count`) is the source of truth after every tap.

After a stamp/redeem/settings sync, TapStamp records:

| Column | Meaning |
|--------|---------|
| `last_wallet_sync_at` | When Apple/Google were last notified |
| `last_wallet_sync_ok` | `true` if a channel synced (or nothing was registered yet) |
| `last_wallet_sync_error` | Short machine reason when sync failed (not shown to customers) |

If Wallet push fails:

- **Customer phone page** says the stamp is saved and to show the screen / member code at the counter
- **Owner app → Customers → member** shows “Wallet may be out of date” and highlights the real stamp count
- Edge logs still record per-serial failures

---

## Manual verification (non-engineer)

Success: a customer gets a stamp with one NFC tap, sees progress on their phone, and the owner can trust the stamp count even if Wallet is slow.

1. Open your chip URL: `https://tapstamp.co/tap/{YOUR_CHIP_CODE}` on a phone.
2. First visit: join (if asked) → **Add to Apple Wallet** or **Add to Google Wallet** → confirm thanks page.
3. Return visit (or next calendar day if daily limit is on): tap the chip again.
4. Phone should show **Stamp added** with stamp dots filled.
5. Open Wallet → pass should refresh to the same count (may take a few seconds).
6. In the TapStamp owner app: **Customers** → that member → **Current stamps** matches the tap page.
7. If Wallet looks wrong: trust the app stamp count (and the phone tap screen). You should see a plain warning on the customer screen when the last Wallet update failed.

Optional health checks (engineer / support):

- `GET https://tapstamp.co/tap/INVALID` → page loads (not an error dump)
- `GET https://tapstamp.co/google-wallet/?diag=1` → `configured: true` (public save may still be test-accounts-only until Google publishing access)

---

## Out of scope / follow-ups (from inventory)

1. **Google Wallet public save** — still needs Google Console publishing approval; Android “anyone can save” waits on that ops step.
2. **Confirm `APNS_PRODUCTION=true`** on live Apple push for real devices (`docs/GO_LIVE.md`).
3. Deploy this heartbeat’s edge + migration (`028_pass_wallet_sync`) to production before expecting sync columns in live data.

