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
  var viewKey = 'nfc_success_view_' + (sessionId || '');
  /** Canonical Offer A / E1 success CTA id for M2 (MJ-14 §4.1 / MJ-29 restore). */
  var CTA_ITEM_ID = 'nfc_success_cta_v2';
  var UPSELL_CONTENT_TYPE = 'loyalty_upsell';

  function showError(msg) {
    loading.classList.add('hidden');
    err.classList.remove('hidden');
    document.getElementById('error-msg').textContent = msg;
  }

  function buildLoyaltyUrl(data, channel) {
    var orderBase = (cfg.LOYALTY_ORDER_URL || 'https://tapstamp.co/order').replace(/\/$/, '');
    var qs = new URLSearchParams({ from: 'nfc', plan: 'pro' });
    if (data.email) qs.set('email', data.email);
    if (data.businessName) qs.set('business_name', data.businessName);
    if (data.sku) qs.set('nfc_sku', String(data.sku).slice(0, 80));
    if (channel) qs.set('nfc_channel', channel);
    return orderBase + '?' + qs.toString();
  }

  function trackSuccessView(data) {
    try {
      if (sessionStorage.getItem(viewKey)) return;
      sessionStorage.setItem(viewKey, '1');
    } catch (_) { /* continue */ }
    analytics.event('nfc_success_view', {
      transaction_id: sessionId,
      content_type: UPSELL_CONTENT_TYPE,
      item_id: CTA_ITEM_ID,
      nfc_sku: data.sku || undefined,
    });
    analytics.event('view_promotion', {
      promotion_id: UPSELL_CONTENT_TYPE,
      promotion_name: CTA_ITEM_ID,
      creative_name: 'nfc_success_panel',
      transaction_id: sessionId,
    });
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

      var loyaltyUrlCta = buildLoyaltyUrl(result.data, 'success_cta');
      var loyaltyUrlCheckbox = buildLoyaltyUrl(result.data, 'checkout_checkbox');

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
          content_type: UPSELL_CONTENT_TYPE,
          item_id: 'nfc_checkout_checkbox_redirect',
          transaction_id: sessionId,
          nfc_sku: result.data.sku || undefined,
        });
        analytics.event('nfc_loyalty_cta_click', {
          content_type: UPSELL_CONTENT_TYPE,
          item_id: 'nfc_checkout_checkbox_redirect',
          transaction_id: sessionId,
          nfc_channel: 'checkout_checkbox',
          nfc_sku: result.data.sku || undefined,
        });
        if (loading) {
          loading.innerHTML = '<p style="color:var(--muted)">Payment confirmed — continuing to stamp loyalty…</p>';
        }
        location.href = loyaltyUrlCheckbox;
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

      trackSuccessView(result.data);

      var loyaltyCta = document.getElementById('loyalty-upsell-cta');
      if (loyaltyCta) {
        loyaltyCta.href = loyaltyUrlCta;
        loyaltyCta.addEventListener('click', function () {
          analytics.event('select_content', {
            content_type: UPSELL_CONTENT_TYPE,
            item_id: CTA_ITEM_ID,
            transaction_id: sessionId,
            nfc_sku: result.data.sku || undefined,
          });
          analytics.event('nfc_loyalty_cta_click', {
            content_type: UPSELL_CONTENT_TYPE,
            item_id: CTA_ITEM_ID,
            transaction_id: sessionId,
            nfc_channel: 'success_cta',
            nfc_sku: result.data.sku || undefined,
          });
        });
      }

      var skipLink = document.querySelector('.loyalty-upsell-skip');
      if (skipLink) {
        skipLink.addEventListener('click', function () {
          analytics.event('nfc_success_skip', {
            content_type: UPSELL_CONTENT_TYPE,
            item_id: CTA_ITEM_ID,
            transaction_id: sessionId,
          });
        });
      }
    })
    .catch(function () {
      showError('Could not reach the server. Refresh, or email support@tapstamp.co with your receipt.');
    });
})();
