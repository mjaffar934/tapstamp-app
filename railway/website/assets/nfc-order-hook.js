/**
 * NFC → loyalty order deep-link hook.
 * Safe to load on /order: prefills fields, shows a one-line banner when from=nfc,
 * and attaches signup attribution on the next order-checkout POST.
 */
(function () {
  var params = new URLSearchParams(location.search);
  var from = (params.get('from') || '').toLowerCase();
  if (from !== 'nfc') return;

  var email = params.get('email');
  var businessName = params.get('business_name');
  var nfcSku = params.get('nfc_sku');

  var emailInput = document.getElementById('email');
  if (email && emailInput && !emailInput.value) emailInput.value = email;

  var bizInput = document.getElementById('business_name');
  if (businessName && bizInput && !bizInput.value) bizInput.value = businessName;

  var existing = document.getElementById('nfc-upsell-banner');
  if (existing) {
    existing.classList.remove('hidden');
  } else {
    var lead = document.querySelector('.order-lead');
    if (lead && lead.parentNode) {
      var banner = document.createElement('div');
      banner.id = 'nfc-upsell-banner';
      banner.className = 'alert alert-info';
      banner.innerHTML =
        'You already bought an Instagram/Google NFC card — that order stands alone. This page starts stamp loyalty: Wallet cards for customers, one-tap stamps, visit tracking. Card on file, £0 today.';
      lead.parentNode.insertBefore(banner, lead.nextSibling);
    }
  }

  var origFetch = window.fetch;
  if (typeof origFetch !== 'function') return;
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var isOrderCheckout = /order-checkout/.test(url);
      if (isOrderCheckout && init && typeof init.body === 'string') {
        var headers = init.headers || {};
        var ctype = typeof headers.get === 'function'
          ? headers.get('Content-Type') || headers.get('content-type')
          : headers['Content-Type'] || headers['content-type'] || '';
        if (String(ctype).indexOf('application/json') !== -1) {
          var body = JSON.parse(init.body);
          body.from = 'nfc';
          if (nfcSku) body.nfc_sku = String(nfcSku).slice(0, 80);
          init = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      }
    } catch (_) { /* ignore */ }
    return origFetch.call(this, input, init);
  };
})();
