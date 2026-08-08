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

  function buildLoyaltyUrl(data) {
    var orderBase = (cfg.LOYALTY_ORDER_URL || 'https://tapstamp.co/order').replace(/\/$/, '');
    var qs = new URLSearchParams({ from: 'nfc', plan: 'pro' });
    if (data.email) qs.set('email', data.email);
    if (data.businessName) qs.set('business_name', data.businessName);
    if (data.sku) qs.set('nfc_sku', String(data.sku).slice(0, 80));
    return orderBase + '?' + qs.toString();
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

      var loyaltyUrl = buildLoyaltyUrl(result.data);

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
            start_loyalty: result.data.startLoyalty ? 1 : 0,
          });
        }
      } catch (_) { /* ignore */ }

      // Checkbox opt-in: after hardware payment, continue into /order with prefills
      if (result.data.startLoyalty) {
        analytics.event('select_content', {
          content_type: 'loyalty_upsell',
          item_id: 'nfc_checkout_checkbox_redirect',
        });
        if (loading) {
          loading.innerHTML = '<p style="color:var(--muted)">Payment confirmed — continuing to stamp loyalty…</p>';
        }
        location.href = loyaltyUrl;
        return;
      }

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
        loyaltyCta.href = loyaltyUrl;
        loyaltyCta.addEventListener('click', function () {
          analytics.event('select_content', {
            content_type: 'loyalty_upsell',
            item_id: 'nfc_success_cta_v2',
          });
        });
      }
    })
    .catch(function () {
      showError('Could not reach the server. Refresh, or email support@tapstamp.co with your receipt.');
    });
})();
