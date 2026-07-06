/** Public config only — no API keys or secrets. */
window.TAPSTAMP = {
  CHECKOUT_API: 'https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout',
  SITE_URL: 'https://tapstamp.co',
  /** iOS owner app — TestFlight or App Store. Update when published. */
  APP_STORE_IOS: '',
  HARDWARE_GBP: 35,
  PLANS: {
    starter: { name: 'Starter', monthly: null, tagline: 'Free after trial — up to 50 customers per month' },
    pro: { name: 'Pro', monthly: 25, tagline: 'Unlimited customers — £25/mo after trial' },
    multi: { name: 'Multi-site', monthly: 59, tagline: 'Up to 5 locations — £59/mo after trial' },
  },
};
