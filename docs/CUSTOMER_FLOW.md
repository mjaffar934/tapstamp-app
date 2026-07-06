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
