# App Store Connect — TapStamp owner app

Bundle ID: `com.tapstampp.owner` (matches ASC app; note the double `p`)  
ASC Apple ID: `6793987872`  
Support URL: https://tapstamp.co/support  
Privacy URL: https://tapstamp.co/privacy  
Support email: support@tapstamp.co

## Sign-in decision (v1)

**Ship with email + password only.** No Apple Sign-In, no Google Sign-In for owners.

- Staff still use staff codes.
- **No in-app business registration** (App Review 3.1.1). Owners create accounts on the website order flow (`https://tapstamp.co/order`), then sign in to the app.
- Sign in with Apple is only required if you offer other social logins (e.g. Google).
- Add Apple/Google later if owners ask — then enable both (never Google alone).

## Account deletion (App Review 5.1.1(v))

In-app: **Settings → Account → Delete account** (type `DELETE`, then confirm).

Backend: Supabase edge function `delete-account` (cancels Stripe subscription when present, deletes cafe + business data, then auth user).

For review: attach a device screen recording of sign-in → Settings → Account → delete flow in **App Review Information → Notes**.

## App Store icon (logo)

ASC / the build need a **1024 × 1024** PNG, RGB, **no transparency**, no rounded corners (Apple rounds it).

Repo file: `assets/icon.png` (already 1024×1024 RGB). EAS embeds this in the IPA — that becomes the App Store icon from the build. You do not separately upload a logo for the listing icon in most cases; use your marketing screenshots for the gallery.

## TestFlight build + install

```bash
npx eas-cli login
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

Then ASC → **TestFlight** → wait for processing → add yourself to **Internal Testing** → install via the TestFlight app on iPhone.

## EAS Update (OTA JS)

Production builds use channel `production` and `runtimeVersion` policy `appVersion` (matches `expo.version`, e.g. `1.0.0`).

```bash
# Ship JS/asset-only fixes without a new App Store binary
npx eas update --channel production --message "Fix copy on settings"

# Native changes (new plugins, permissions, expo-updates itself) still need a new build
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

The first build that includes `expo-updates` is required before OTA works on devices.

## Before public App Store submit

1. App ID `com.tapstampp.owner` + Push Notifications in Apple Developer
2. ASC app `6793987872` (TapStamp Owner)
3. Listing: screenshots, description, privacy URL, demo login
4. Build + submit above, test on TestFlight
5. Submit for Review when ready for public

## Listing fields (draft)

| Field | Suggested |
|--------|-----------|
| Name | TapStamp |
| Subtitle | Wallet loyalty for shops |
| Category | Business |
| Age rating | 4+ |
| Keywords | loyalty,wallet,stamps,cafe,salon,rewards,nfc |

**Promotional text:**

```
Wallet loyalty for independents. Customers stamp in Apple & Google Wallet — lock-screen alerts when rewards unlock. No app for them to download.
```

**Description (short draft):**

TapStamp lets independent shops run Apple Wallet and Google Wallet stamp cards from one owner app. Customers add a pass with a tap — no app to download. Staff stamp and redeem at the counter. Customers get lock-screen updates when stamps land and rewards unlock.

**Review notes:** Provide a demo owner login if requested. Customer tap demo: https://tapstamp.co/tap/TS0007 (or your live chip). Camera permission is for scanning Wallet QR codes in barista mode.

Business accounts are created only on the website (https://tapstamp.co/order). The iOS app is sign-in only for existing owners. Billing is Stripe on the web / Customer Portal (no IAP). Account deletion: Settings → Account → Delete account.

## Screenshots needed

Shoot from the same binary you submit (not marketing composites). Avoid splash/login as the primary shots.

**iPhone 6.7" / 6.5":** dashboard, barista stamp, card settings, customers list

**13-inch iPad** (required while `supportsTablet: true`): same in-app screens from iPad Simulator or device. ASC → Previews and Screenshots → **View All Sizes in Media Manager** → replace the 13" set.

Suggested shot list:
1. Home / recent activity
2. Barista stamp / scan mode
3. Customers list
4. Card / pass design settings
5. Settings or billing overview

## App Review reply (template)

```
We’ve addressed the issues from submission 8eef69e4-277d-473f-87d6-a758d32953d2:

1. Guideline 3.1.1 — Removed in-app business/organization registration. New shops create accounts only via our website order flow; the iOS app is sign-in only for existing owners. SaaS billing remains Stripe hosted (no IAP).

2. Guideline 5.1.1(v) — Added in-app account deletion: Settings → Account → Delete account (with confirmation). Screen recording attached in App Review Notes.

3. Guideline 2.3.3 — Uploaded new 13-inch iPad screenshots showing the current app UI (core features in use).

Demo login: [email / password]
```

## Ops checklist

- [ ] `APNS_PRODUCTION=true` on Supabase for production Wallet pushes
- [ ] Stripe live keys + Customer Portal + `invoice.payment_failed` webhook
- [ ] Google Wallet Console support email = support@tapstamp.co
- [ ] Set `APP_STORE_IOS` in `website/assets/config.js` after App Store URL exists
- [ ] Production EAS build uses `eas.json` env only (no `EXPO_PUBLIC_DEV_*` / admin secrets in the IPA)
- [ ] Listing screenshots (iPhone + 13" iPad) + review demo login ready
- [ ] `delete-account` edge function deployed
- [ ] Account deletion screen recording in ASC Notes
