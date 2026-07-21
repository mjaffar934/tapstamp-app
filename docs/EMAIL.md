# Support email — `support@tapstamp.com`

Public contact used on the site, owner app, and Wallet passes.

## Get access to the inbox

You need to **own `tapstamp.com`** (DNS) and create the mailbox or a forwarder.

### Option A — Cloudflare Email Routing (free, recommended)

1. Add `tapstamp.com` to Cloudflare (or move DNS there).
2. Email → Email Routing → enable routing.
3. Add destination address = your personal Gmail (e.g. the one you use day-to-day) and verify it.
4. Create rule: `support@tapstamp.com` → forward to that Gmail.
5. Keep MX records on Cloudflare as instructed.

You read and reply from Gmail; customers still see `support@tapstamp.com` if you set “Send mail as” (optional, needs SMTP).

### Option B — Google Workspace

1. Buy Google Workspace for `tapstamp.com`.
2. Create user `support@tapstamp.com`.
3. Sign in at [mail.google.com](https://mail.google.com) with that account (or add it to your phone).

### Option C — Apple iCloud+ Custom Email

If you use iCloud+ Custom Email Domain, add `tapstamp.com` and create `support@`.

## After DNS works

Test: send mail **to** `support@tapstamp.com` from another address and confirm it arrives.

Use this address in Google Wallet Console → Business profile → Customer support email.

Site support page: https://tapstamp.co/support
