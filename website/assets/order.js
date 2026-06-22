(function () {
  var cfg = window.TAPSTAMP;
  var params = new URLSearchParams(location.search);
  var plan = params.get('plan') || 'starter';
  if (!['starter', 'pro', 'multi'].includes(plan)) plan = 'starter';

  document.querySelectorAll('input[name=plan]').forEach(function (input) {
    input.checked = input.value === plan;
  });

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

  document.querySelectorAll('.plan').forEach(function (el) {
    el.addEventListener('click', function () {
      var input = el.querySelector('input');
      if (input) {
        input.checked = true;
        plan = input.value;
        updateSummary();
      }
    });
  });

  function updateSummary() {
    var selected = document.querySelector('input[name=plan]:checked');
    if (!selected) return;
    var p = cfg.PLANS[selected.value];
    var sub = document.getElementById('sub-line');
    if (sub) sub.style.display = p.monthly ? 'flex' : 'none';
    if (sub && p.monthly) sub.querySelector('span:last-child').textContent = '£' + p.monthly + '/mo after trial';
  }
  updateSummary();

  document.getElementById('order-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('submit-btn');
    var errEl = document.getElementById('alert-error');
    errEl.classList.add('hidden');

    var selected = document.querySelector('input[name=plan]:checked');
    var body = {
      plan: selected ? selected.value : plan,
      owner_name: document.getElementById('owner_name').value.trim(),
      business_name: document.getElementById('business_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      shipping_address_line1: document.getElementById('shipping_address_line1').value.trim(),
      city: document.getElementById('city').value.trim(),
      postcode: document.getElementById('postcode').value.trim(),
      shipping_phone: document.getElementById('shipping_phone').value.trim(),
    };

    if (body.password.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating checkout…';

    try {
      var res = await fetch(cfg.CHECKOUT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json();
      if (data.checkoutUrl) {
        location.href = data.checkoutUrl;
        return;
      }
      errEl.textContent = data.message || data.error || 'Could not start checkout';
      errEl.classList.remove('hidden');
    } catch (err) {
      errEl.textContent = 'Network error — try again';
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Continue to payment →';
    }
  });
})();
