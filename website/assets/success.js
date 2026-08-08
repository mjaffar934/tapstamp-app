(function () {
  var cfg = window.TAPSTAMP;
  var analytics = window.TapstampAnalytics || { event: function () {} };
  var params = new URLSearchParams(location.search);
  var sessionId = params.get('session_id');
  var signup = params.get('signup') === '1';
  var signupEmail = params.get('email');
  var signupPlan = params.get('plan') || 'pro';
  if (signupPlan === 'starter') signupPlan = 'pro';
  var billingHint = params.get('billing') === '1';
  var fromParam = (params.get('from') || '').toLowerCase();
  var fromApp = fromParam === 'app';
  var fromNfc = fromParam === 'nfc';
  var emailDayRaw = params.get('email_day') || params.get('nfc_email_day') || '';
  var emailDay = /^[027]$/.test(String(emailDayRaw)) ? String(emailDayRaw) : '';
  var nfcChannel = (params.get('nfc_channel') || '').slice(0, 40);
  if (!nfcChannel && fromNfc) {
    nfcChannel = emailDay ? ('email_day_' + emailDay) : 'order_direct';
  }
  var loading = document.getElementById('loading');
  var orderContent = document.getElementById('order-success');
  var billingContent = document.getElementById('billing-success');
  var error = document.getElementById('error-content');
  var completeKey = 'nfc_loyalty_complete_' + (sessionId || signupEmail || '');

  function trackNfcSignupComplete() {
    if (!fromNfc) return;
    try {
      if (completeKey && sessionStorage.getItem(completeKey)) return;
      if (completeKey) sessionStorage.setItem(completeKey, '1');
    } catch (_) { /* ignore */ }
    analytics.event('nfc_loyalty_signup_complete', {
      content_type: 'loyalty_upsell',
      item_id: 'nfc_success_cta_v3',
      signup_source: 'nfc',
      nfc_channel: nfcChannel || undefined,
      email_day: emailDay || undefined,
      transaction_id: sessionId || undefined,
    });
  }

  function appBillingLink(email) {
    var url = 'tapstamp://settings/billing';
    if (email && email.includes('@')) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'email=' + encodeURIComponent(email);
    }
    return url;
  }

  function appSignInLink(email) {
    var url = 'tapstamp://sign-in';
    if (email && email.includes('@')) {
      url += '?email=' + encodeURIComponent(email);
    }
    return url;
  }

  function openAppSoon(href) {
    setTimeout(function () {
      location.href = href;
    }, 500);
  }

  function showBillingSuccess(email, planId) {
    var plan = cfg.PLANS[planId] || cfg.PLANS.pro;
    var line = document.getElementById('billing-plan-line');
    if (line) {
      if (plan.monthly) {
        line.textContent = 'Card saved. Still £0 today — ' + plan.name + ' (£' + plan.monthly + '/mo) only starts after 50 unique customers in a month.';
      } else {
        line.textContent = 'Card on file. Software stays £0 until 50 unique customers/month.';
      }
    }

    var openApp = document.getElementById('open-app-billing');
    if (openApp) openApp.href = appBillingLink(email);

    var openErr = document.getElementById('open-app-error');
    if (openErr) openErr.href = appBillingLink(email);

    loading.classList.add('hidden');
    billingContent.classList.remove('hidden');
    openAppSoon(appBillingLink(email));
  }

  function showOrderSuccess(email, planId) {
    var plan = cfg.PLANS[planId] || cfg.PLANS.pro;
    document.getElementById('success-email').textContent = email;
    document.getElementById('success-email-2').textContent = email;
    document.getElementById('success-plan').textContent = plan.name;
    var afterTrial = plan.monthly
      ? 'Still £0 today. ' + plan.name + ' (£' + plan.monthly + '/mo) only after 50 unique customers this month.'
      : 'Still £0 — free for your first 50 unique customers each month.';
    document.getElementById('after-trial').textContent = afterTrial;

    var openApp = document.getElementById('open-app-order');
    if (openApp) openApp.href = appSignInLink(email);

    loading.classList.add('hidden');
    orderContent.classList.remove('hidden');
    trackNfcSignupComplete();

    if (fromApp) {
      openAppSoon(appSignInLink(email));
    }
  }

  function showError(message) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    document.getElementById('error-msg').textContent = message;
    var openErr = document.getElementById('open-app-error');
    if (openErr) {
      openErr.href = billingHint ? appBillingLink(signupEmail || '') : appSignInLink(signupEmail || '');
    }
  }

  function resolveFlow(apiFlow) {
    if (billingHint) return 'billing';
    if (apiFlow === 'billing') return 'billing';
    return 'order';
  }

  if (signup && signupEmail) {
    showOrderSuccess(signupEmail, signupPlan);
    return;
  }

  if (!sessionId) {
    showError('Missing session. Open the owner app and continue from Plan.');
    return;
  }

  fetch(cfg.CHECKOUT_API + '?success=1&session_id=' + encodeURIComponent(sessionId))
    .then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (_) {
          data = null;
        }
        return { data: data };
      });
    })
    .then(function (result) {
      if (!result.data) {
        showError('Could not confirm (bad server response). Open the owner app from Plan / billing.');
        return;
      }
      if (!result.data.ok) {
        showError(result.data.error || 'Could not confirm');
        return;
      }

      var email = result.data.email || signupEmail || '';
      var planId = result.data.plan || signupPlan || 'pro';
      if (planId === 'starter') planId = 'pro';
      var flow = resolveFlow(result.data.flow);

      if (flow === 'billing') {
        showBillingSuccess(email, planId);
      } else {
        showOrderSuccess(email || 'your account', planId);
      }
    })
    .catch(function () {
      showError('Could not reach server — refresh, or open the owner app from Plan / billing.');
    });
})();
