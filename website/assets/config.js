/** Public config only — no API keys or secrets. */
window.TAPSTAMP = {
  CHECKOUT_API: 'https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout',
  SITE_URL: 'https://tapstamp.co',
  APP_STORE_IOS: '',
  HARDWARE_GBP: 0,
  TRIAL_DAYS: 14,
  PLANS: {
    starter: {
      name: 'Starter',
      monthly: null,
      monthlyLabel: 'Free after trial',
      cap: '50 unique customers/month',
    },
    pro: {
      name: 'Pro',
      monthly: 25,
      monthlyLabel: '£25/mo after trial',
      cap: 'Unlimited customers/month',
    },
    multi: {
      name: 'Multi-site',
      monthly: 59,
      monthlyLabel: '£59/mo after trial',
      cap: 'Up to 5 locations',
    },
  },
};
