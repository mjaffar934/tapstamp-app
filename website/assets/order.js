(function () {
  var cfg = window.TAPSTAMP;
  var params = new URLSearchParams(location.search);
  var fromParam = (params.get('from') || '').toLowerCase();
  var fromApp = fromParam === 'app';
  var fromNfc = fromParam === 'nfc';
  var signupFrom = fromApp ? 'app' : (fromNfc ? 'nfc' : '');

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
    var nfcSku = params.get('nfc_sku');
    if (fromNfc && nfcSku) body.nfc_sku = nfcSku.slice(0, 80);

    if (body.password.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters';
      errEl.classList.remove('hidden');
      return;
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
