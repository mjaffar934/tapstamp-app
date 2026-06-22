/** Edit SUPABASE_PROJECT if you change projects. Used by order + success pages only. */
window.TAPSTAMP = {
  CHECKOUT_API: 'https://biootanbxmqfserzgnxe.supabase.co/functions/v1/order-checkout',
  SITE_URL: 'https://tapstamp.co',
  HARDWARE_GBP: 35,
  PLANS: {
    starter: { name: 'Starter', monthly: null, tagline: 'Free after trial — up to 50 customers per month' },
    pro: { name: 'Pro', monthly: 25, tagline: 'Unlimited customers — £25/mo after trial' },
    multi: { name: 'Multi-site', monthly: 59, tagline: 'Up to 5 locations — £59/mo after trial' },
  },
};
