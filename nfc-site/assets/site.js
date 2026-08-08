(function () {
  var cfg = window.NFC_SHOP;
  var cart = window.NfcCart;
  if (!cfg || !cart) return;

  var prefix = cfg.PATH_PREFIX || '';

  function fixAssetAttrs(root) {
    if (prefix !== '/reviews') return;
    (root || document).querySelectorAll('link[href^="/assets"], link[href="/favicon.svg"], script[src^="/assets"], img[src^="/assets"]').forEach(function (el) {
      var attr = el.tagName === 'SCRIPT' || el.tagName === 'IMG' ? 'src' : 'href';
      var val = el.getAttribute(attr);
      if (val && val.indexOf('/reviews') !== 0) el.setAttribute(attr, '/reviews' + val);
    });
  }

  function wireLinks() {
    document.querySelectorAll('[data-link]').forEach(function (a) {
      var href = a.getAttribute('data-link');
      a.href = cart.path(href);
    });
  }

  function refreshCartCount() {
    var n = cart.totalUnits();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n ? String(n) : '';
      el.classList.toggle('is-empty', !n);
    });
  }

  var analytics = window.NfcAnalytics || { event: function () {} };

  function trackAdd(items) {
    analytics.event('add_to_cart', {
      currency: 'GBP',
      items: items.map(function (sku) {
        var p = cfg.PRODUCTS[sku];
        return p ? { item_id: sku, item_name: p.name, price: p.priceGbp, quantity: 1 } : null;
      }).filter(Boolean),
    });
  }

  document.addEventListener('click', function (e) {
    var bundleBtn = e.target.closest('[data-add-bundle]');
    if (bundleBtn) {
      e.preventDefault();
      var skus = (bundleBtn.getAttribute('data-add-bundle') || '').split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (sku) { return !!cfg.PRODUCTS[sku]; });
      skus.forEach(function (sku) { cart.add(sku, 1); });
      trackAdd(skus);
      refreshCartCount();
      if (bundleBtn.getAttribute('data-go') === 'checkout') {
        location.href = cart.path('/checkout');
      } else {
        bundleBtn.textContent = 'Added';
        setTimeout(function () {
          bundleBtn.textContent = bundleBtn.getAttribute('data-label') || 'Get this deal';
        }, 900);
      }
      return;
    }

    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    var sku = btn.getAttribute('data-add');
    if (!cfg.PRODUCTS[sku]) return;
    cart.add(sku, 1);
    trackAdd([sku]);
    refreshCartCount();
    if (btn.getAttribute('data-go') === 'checkout') {
      location.href = cart.path('/checkout');
    } else {
      btn.textContent = 'Added';
      setTimeout(function () { btn.textContent = btn.getAttribute('data-label') || 'Add to cart'; }, 900);
    }
  });

  window.addEventListener('nfc-cart-changed', refreshCartCount);
  fixAssetAttrs(document);
  wireLinks();
  refreshCartCount();
})();
