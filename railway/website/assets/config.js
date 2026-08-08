/** Public config only — no API keys or secrets. */
window.TAPSTAMP = {
  CHECKOUT_API: '/order-checkout',
  SITE_URL: 'https://tapstamp.co',
  /** Same GA4 property as NFC shop — NFC→loyalty funnel M1–M3 */
  GA_MEASUREMENT_ID: 'G-77R50KF8Q5',
  APP_STORE_IOS: '',
  HARDWARE_GBP: 0,
  TRIAL_DAYS: 0,
  PLANS: {
    pro: {
      name: 'Pro',
      monthly: 25,
      monthlyLabel: 'Free until 50 unique customers, then £25/mo',
      cap: 'Unlimited customers/month after 50',
    },
  },
};
