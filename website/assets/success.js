(function () {
  var cfg = window.TAPSTAMP;
  var params = new URLSearchParams(location.search);
  var sessionId = params.get('session_id');
  var signup = params.get('signup') === '1';
  var signupEmail = params.get('email');
  var signupPlan = params.get('plan') || 'starter';
  var loading = document.getElementById('loading');
  var content = document.getElementById('success-content');
  var error = document.getElementById('error-content');

  function appDeepLink(email) {
    return 'tapstamp://sign-in?email=' + encodeURIComponent(email);
  }

  function showSuccess(email, planId) {
    var plan = cfg.PLANS[planId] || cfg.PLANS.starter;
    document.getElementById('success-email').textContent = email;
    document.getElementById('success-email-2').textContent = email;
    document.getElementById('success-plan').textContent = plan.name;
    var afterTrial = plan.monthly
      ? 'After your trial, your ' + plan.name + ' plan is £' + plan.monthly + '/month.'
      : 'Your Starter plan stays free forever — up to 50 unique customers per month after your trial.';
    document.getElementById('after-trial').textContent = afterTrial;

    var openApp = document.getElementById('open-app-link');
    if (openApp) {
      openApp.href = appDeepLink(email);
      openApp.textContent = 'Open owner app';
    }

    content.classList.remove('hidden');
  }

  if (signup && signupEmail) {
    loading.classList.add('hidden');
    showSuccess(signupEmail, signupPlan);
    return;
  }

  if (!sessionId) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    document.getElementById('error-msg').textContent = 'Missing signup session. If you completed signup, sign in to the owner app with your order email.';
    return;
  }

  fetch(cfg.CHECKOUT_API + '?success=1&session_id=' + encodeURIComponent(sessionId))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      loading.classList.add('hidden');
      if (!data.ok || !data.email) {
        error.classList.remove('hidden');
        document.getElementById('error-msg').textContent = data.error || 'Could not confirm signup';
        return;
      }
      showSuccess(data.email, data.plan || 'starter');
    })
    .catch(function () {
      loading.classList.add('hidden');
      error.classList.remove('hidden');
      document.getElementById('error-msg').textContent = 'Could not reach server — try refreshing or sign in to the owner app.';
    });
})();
