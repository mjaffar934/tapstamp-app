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

  function isPaidPlan(planId) {
    return planId === 'pro' || planId === 'multi';
  }

  function updateSummary() {
    var selected = document.querySelector('input[name=plan]:checked');
    if (!selected) return;
    var p = cfg.PLANS[selected.value];
    var sub = document.getElementById('sub-line');
    var subAmount = document.getElementById('sub-amount');
    var dueToday = document.getElementById('due-today');
    var cardLine = document.getElementById('card-line');
    var btn = document.getElementById('submit-btn');

    if (subAmount) {
      subAmount.textContent = p.monthly == null ? 'Free' : '£' + p.monthly + '/mo';
    }
    if (dueToday) dueToday.textContent = '£0';
    if (sub) sub.style.display = 'flex';
    if (cardLine) {
      cardLine.classList.toggle('hidden', !isPaidPlan(selected.value));
    }
    if (btn) {
      btn.textContent = isPaidPlan(selected.value)
        ? 'Continue to card setup →'
        : 'Create account →';
    }
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

    var paid = isPaidPlan(body.plan);
    btn.disabled = true;
    btn.textContent = paid ? 'Starting card setup…' : 'Creating account…';

    try {
      var res = await fetch(cfg.CHECKOUT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json();
      if (data.accountReady && data.email) {
        location.href = '/order/success?signup=1&email=' + encodeURIComponent(data.email) + '&plan=' + encodeURIComponent(data.plan || body.plan);
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
      updateSummary();
    }
  });
})();
