# Support email — `support@tapstamp.co`

Public contact used on the site, owner app, and Wallet passes.

Domain: **`tapstamp.co`** (Namecheap). Inbox is a **forwarder** to your Gmail.

## Transactional product email (Offer A nurture)

Hardware → loyalty Day 0 / 2 / 7 sequence (Edge Function + DB queue):

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` (or `EMAIL_API_KEY`) | Send via [Resend](https://resend.com) |
| `EMAIL_FROM` | Verified sender, e.g. `TapStamp <noreply@tapstamp.co>` |
| `EMAIL_REPLY_TO` | Optional; defaults to `support@tapstamp.co` |
| `NFC_LOYALTY_NURTURE_ENABLED` | Kill switch — defaults **on**; set `false`/`0`/`off` to pause |
| `NFC_NURTURE_CRON_SECRET` | Bearer token for `POST …/nfc-loyalty-nurture` |

Trigger: Stripe webhook `purpose=hardware_shop` + paid → Day 0 send; Day 2/7 via hourly cron `nfc-loyalty-nurture`. Suppresses pending rows when loyalty `order_status=paid` on the same email.

Copy finals: MJ-20 `offer-a-emails`. Migration: `029_hardware_nurture_emails.sql`.

Verify templates locally: `node scripts/nfc-loyalty-nurture-check.mjs`

## Set up / confirm forwarding

1. Namecheap → Domain List → **tapstamp.co** → Manage
2. **Advanced DNS** → Mail Settings = **Email Forwarding**
3. **Domain** tab → Redirect Email → Add Forwarder
   - Alias: `support`
   - Forward to: your Gmail
4. Save with ✓

Test: send mail **to** `support@tapstamp.co` from another address and confirm it arrives (check Spam).

Forwarding is receive-only. Replies still send from your Gmail unless you add “Send mail as” later.

## Product links

- Site: https://tapstamp.co/support
- Google Wallet Console → Business profile → Customer support email: `support@tapstamp.co`
