/** NFC shop public config — no secrets */
window.NFC_SHOP = {
  CHECKOUT_API: '/hardware-checkout',
  CONTACT_API: '/nfc-contact',
  /** Absolute — NFC shop may run on /reviews or a separate host */
  LOYALTY_ORDER_URL: 'https://tapstamp.co/order',
  SITE: 'nfc',
  ASSET_BASE: '',
  GA_MEASUREMENT_ID: 'G-77R50KF8Q5',
  PRODUCTS: {
    google_stand: {
      id: 'google_stand',
      name: 'Google Reviews NFC stand',
      priceGbp: 18.99,
      compareAtGbp: 26.99,
      image: '/assets/products/google-stand.png',
      family: 'google',
      kind: 'stand',
      blurb: 'Counter stand. Pre-programmed to your Google review page.',
    },
    instagram_stand: {
      id: 'instagram_stand',
      name: 'Instagram NFC stand',
      priceGbp: 18.99,
      compareAtGbp: 26.99,
      image: '/assets/products/instagram-stand.png',
      family: 'instagram',
      kind: 'stand',
      blurb: 'Counter stand. Pre-programmed to your Instagram.',
    },
    google_epoxy: {
      id: 'google_epoxy',
      name: 'Google Reviews NFC',
      priceGbp: 14.99,
      compareAtGbp: 21.99,
      image: '/assets/products/google-epoxy.png',
      family: 'google',
      kind: 'epoxy',
      blurb: 'Professional domed NFC — stick it anywhere. We program it.',
    },
    instagram_epoxy: {
      id: 'instagram_epoxy',
      name: 'Instagram NFC',
      priceGbp: 14.99,
      compareAtGbp: 21.99,
      image: '/assets/products/instagram-epoxy.png',
      family: 'instagram',
      kind: 'epoxy',
      blurb: 'Professional domed NFC — stick it anywhere. We program it.',
    },
  },
  DEALS: {
    stand_pair: { label: 'Google + Instagram stands', pence: 3499 },
    epoxy_pair: { label: 'Two NFC (epoxy)', pence: 2499 },
    mixed: { label: 'Stand + NFC', pence: 3299 },
  },
};

(function () {
  var path = location.pathname || '';
  if (path === '/reviews' || path.indexOf('/reviews/') === 0) {
    window.NFC_SHOP.ASSET_BASE = '/reviews';
    window.NFC_SHOP.CHECKOUT_API = '/hardware-checkout';
    window.NFC_SHOP.CONTACT_API = '/nfc-contact';
    window.NFC_SHOP.PATH_PREFIX = '/reviews';
  } else {
    window.NFC_SHOP.PATH_PREFIX = '';
  }
})();
