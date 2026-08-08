(function () {
  var cfg = window.NFC_SHOP;
  var cart = window.NfcCart;
  var analytics = window.NfcAnalytics || { event: function () {} };
  var params = new URLSearchParams(location.search);
  var sessionId = params.get('session_id');
  var loading = document.getElementById('loading');
  var ok = document.getElementById('success');
  var err = document.getElementById('error');
  var trackedKey = 'nfc_purchase_' + (sessionId || '');

  function showError(msg) {
    loading.classList.add('hidden');
    err.classList.remove('hidden');
    document.getElementById('error-msg').textContent = msg;
  }

  if (!sessionId) {
    showError('Missing payment session. If you were charged, email support@tapstamp.co.');
    return;
  }

  fetch((cfg.CHECKOUT_API || '/hardware-checkout') + '?success=1&session_id=' + encodeURIComponent(sessionId))
    .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
    .then(function (result) {
      if (!result.ok || !result.data || !result.data.ok) {
        showError((result.data && result.data.error) || 'Could not confirm payment');
        return;
      }
      if (cart) cart.clear();
      loading.classList.add('hidden');
      ok.classList.remove('hidden');
      document.getElementById('success-email').textContent = result.data.email || 'your inbox';
      document.getElementById('success-product').textContent = result.data.productName || 'your NFC order';
      var ship = document.getElementById('success-ship');
      if (ship) {
        if (result.data.londonDropoff) {
          ship.textContent = 'Free London drop-off selected — we’ll be in touch to arrange delivery.';
        } else if (result.data.nextDay) {
          ship.textContent = 'Free next-day UK delivery unlocked — we will pack this as a priority.';
        } else {
          ship.textContent = 'Free UK delivery — programmed before it ships.';
        }
        if (result.data.googleLookup) {
          ship.textContent += ' We’ll find your Google review link from your business details.';
        }
      }

      var loyaltyCta = document.getElementById('loyalty-upsell-cta');
      if (loyaltyCta) {
        var orderBase = (cfg.LOYALTY_ORDER_URL || 'https://tapstamp.co/order').replace(/\/$/, '');
        var qs = new URLSearchParams({ from: 'nfc', plan: 'pro' });
        if (result.data.email) qs.set('email', result.data.email);
        if (result.data.businessName) qs.set('business_name', result.data.businessName);
        if (result.data.sku) qs.set('nfc_sku', String(result.data.sku).slice(0, 80));
        loyaltyCta.href = orderBase + '?' + qs.toString();
        loyaltyCta.addEventListener('click', function () {
          analytics.event('select_content', {
            content_type: 'loyalty_upsell',
            item_id: 'nfc_success_cta',
          });
        });
      }

      try {
        if (!sessionStorage.getItem(trackedKey)) {
          sessionStorage.setItem(trackedKey, '1');
          var value = typeof result.data.amountTotal === 'number'
            ? result.data.amountTotal / 100
            : undefined;
          analytics.event('purchase', {
            transaction_id: sessionId,
            currency: 'GBP',
            value: value,
            items: [{ item_name: result.data.productName || 'NFC order' }],
          });
        }
      } catch (_) { /* ignore */ }
    })
    .catch(function () {
      showError('Could not reach the server. Refresh, or email support@tapstamp.co with your receipt.');
    });
})();
