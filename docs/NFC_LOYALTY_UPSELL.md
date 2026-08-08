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

1. NFC checkout success shows **Add stamp loyalty** CTA → `/order?from=nfc&plan=pro` (+ email / business_name / nfc_sku when known)
2. Order page banner when `from=nfc`; prefills email and business name
3. Loyalty Stripe Checkout metadata: `signup_source=nfc`, optional `nfc_sku`
4. Soft shop footer link to the same order URL

## CTA copy (shipped)

- Eyebrow: Optional next step
- Headline: Add stamp loyalty
- Button: Start loyalty →
- Be clear the NFC purchase and loyalty signup are **separate**
- Mention Google Wallet only as limited until Google publishing is approved

## Demo script (2 min)

1. Show NFC product → programmed URL for reviews/IG  
2. Show success CTA → Start loyalty  
3. Land on `/order?from=nfc` banner  
4. Demo Apple Wallet stamp path if available; do not promise Google for all Android users yet  
5. Close on £0 until 50 unique/month for software
