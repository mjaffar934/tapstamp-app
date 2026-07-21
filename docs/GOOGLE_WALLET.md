# Google Wallet — go live

Secrets are already on Supabase (`GOOGLE_WALLET_*`). Until Google grants **publishing access**, only **test accounts** can save cards.

## Customer support URL (required for business profile)

Use this in Google Pay & Wallet Console → Business profile → Customer support / Help desk:

**https://tapstamp.co/support**

Email: `hello@tapstamp.co`

## Why Add to Google Wallet fails today

Your issuer is in **demo mode**. Non-tester Google accounts see a generic error / can’t save. That is Google’s rule, not a TapStamp bug.

## Make it work for you now (testers)

1. Open [Google Pay & Wallet Console](https://pay.google.com/business/console) → **Google Wallet API**
2. Open your issuer → **Users** / **Manage additional users** / **Test accounts**
3. Add every Gmail that should be able to save a card (your phone’s Google account)
4. On Android, open the cafe tap page → **Add to Google Wallet**
5. Confirm the card appears (may show **[TEST ONLY]**)

## Make it work for all customers

1. In the same console, complete **Business profile**
2. Ensure at least one **loyalty class** exists (TapStamp creates these automatically on first Add / stamp)
3. Click **Request publishing access** and wait for Google’s email
4. After approval, set:

```bash
supabase secrets set GOOGLE_WALLET_REVIEW_STATUS=APPROVED --project-ref biootanbxmqfserzgnxe
supabase functions deploy google-wallet tap barista-action redeem --project-ref biootanbxmqfserzgnxe
```

5. Retest with a Google account that is **not** a tester — save should work without `[TEST ONLY]`

## Check config

```bash
curl -sS 'https://tapstamp.co/google-wallet/?diag=1'
# or
curl -sS 'https://biootanbxmqfserzgnxe.supabase.co/functions/v1/google-wallet/?diag=1'
```

Expect `configured: true`, `origins` including `https://tapstamp.co`, and `public: false` until step 4.

## Origins

Save buttons are hosted on `https://tapstamp.co`. JWT origins must include that host (code always merges it; keep the secret too):

```bash
supabase secrets set GOOGLE_WALLET_ORIGINS=https://tapstamp.co,https://biootanbxmqfserzgnxe.supabase.co --project-ref biootanbxmqfserzgnxe
```
