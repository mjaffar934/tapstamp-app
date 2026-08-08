(function () {
  var cfg = window.TAPSTAMP;
  var analytics = window.TapstampAnalytics || { event: function () {} };
  var params = new URLSearchParams(location.search);
  var fromParam = (params.get('from') || '').toLowerCase();
  var fromApp = fromParam === 'app';
  var fromNfc = fromParam === 'nfc';
  var signupFrom = fromApp ? 'app' : (fromNfc ? 'nfc' : '');
  var emailDayRaw = params.get('email_day') || params.get('nfc_email_day') || '';
  var emailDay = /^[027]$/.test(String(emailDayRaw)) ? String(emailDayRaw) : '';
  var nfcChannel = (params.get('nfc_channel') || '').slice(0, 40);
  if (!nfcChannel) {
    nfcChannel = emailDay ? ('email_day_' + emailDay) : (fromNfc ? 'order_direct' : '');
  }
  var nfcSku = params.get('nfc_sku');

  var error = params.get('error');
  if (error) {
    var el = document.getElementById('alert-error');
    el.textContent = decodeURIComponent(error);
    el.classList.remove('hidden');
  }

  if (params.get('canceled') === '1') {
    var info = document.getElementById('alert-canceled');
    info.classList.remove('hidden');
  }

  var nfcBanner = document.getElementById('nfc-upsell-banner');
  if (nfcBanner && fromNfc) nfcBanner.classList.remove('hidden');

  var prefillEmail = params.get('email');
  var prefillBiz = params.get('business_name');
  if (prefillEmail) {
    var emailInput = document.getElementById('email');
    if (emailInput && !emailInput.value) emailInput.value = prefillEmail;
  }
  if (prefillBiz) {
    var bizInput = document.getElementById('business_name');
    if (bizInput && !bizInput.value) bizInput.value = prefillBiz;
  }

  // M1 mid-funnel + M3 land (when email_day present)
  if (fromNfc) {
    analytics.event('nfc_loyalty_order_view', {
      content_type: 'loyalty_upsell',
      item_id: 'nfc_success_cta_v3',
      nfc_channel: nfcChannel || undefined,
      email_day: emailDay || undefined,
      nfc_sku: nfcSku ? String(nfcSku).slice(0, 80) : undefined,
    });
    if (emailDay) {
      analytics.event('nfc_email_click', {
        content_type: 'loyalty_upsell',
        email_day: emailDay,
        nfc_channel: nfcChannel,
        nfc_sku: nfcSku ? String(nfcSku).slice(0, 80) : undefined,
      });
    }
  }

  document.getElementById('order-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('submit-btn');
    var errEl = document.getElementById('alert-error');
    errEl.classList.add('hidden');

    var body = {
      plan: 'pro',
      owner_name: document.getElementById('owner_name').value.trim(),
      business_name: document.getElementById('business_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      shipping_address_line1: document.getElementById('shipping_address_line1').value.trim(),
      city: document.getElementById('city').value.trim(),
      postcode: document.getElementById('postcode').value.trim(),
      shipping_phone: document.getElementById('shipping_phone').value.trim(),
    };
    if (signupFrom) body.from = signupFrom;
    if (fromNfc && nfcSku) body.nfc_sku = nfcSku.slice(0, 80);
    if (fromNfc && emailDay) body.nfc_email_day = emailDay;
    if (fromNfc && nfcChannel) body.nfc_channel = nfcChannel;

    if (body.password.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters';
      errEl.classList.remove('hidden');
      return;
    }

    if (fromNfc) {
      analytics.event('nfc_loyalty_signup_start', {
        content_type: 'loyalty_upsell',
        nfc_channel: nfcChannel || undefined,
        email_day: emailDay || undefined,
        nfc_sku: nfcSku ? String(nfcSku).slice(0, 80) : undefined,
      });
    }

    btn.disabled = true;
    btn.textContent = 'Starting card setup…';

    try {
      var res = await fetch(cfg.CHECKOUT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json();
      if (data.accountReady && data.email) {
        var successQs = 'signup=1&email=' + encodeURIComponent(data.email) + '&plan=pro';
        if (signupFrom) successQs += '&from=' + encodeURIComponent(signupFrom);
        if (fromNfc && nfcChannel) successQs += '&nfc_channel=' + encodeURIComponent(nfcChannel);
        if (fromNfc && emailDay) successQs += '&email_day=' + encodeURIComponent(emailDay);
        location.href = '/order/success?' + successQs;
        return;
      }
      if (data.checkoutUrl) {
        location.href = data.checkoutUrl;
        return;
      }
      errEl.textContent = data.message || data.error || 'Could not complete signup';
      errEl.classList.remove('hidden');
    } catch (err) {
      errEl.textContent = 'Network error — try again';
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Continue to card setup →';
    }
  });
})();
