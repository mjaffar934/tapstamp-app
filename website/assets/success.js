(function () {
  var cfg = window.TAPSTAMP;
  var params = new URLSearchParams(location.search);
  var sessionId = params.get('session_id');
  var loading = document.getElementById('loading');
  var content = document.getElementById('success-content');
  var error = document.getElementById('error-content');

  function appDeepLink(email) {
    return 'tapstamp://sign-in?email=' + encodeURIComponent(email);
  }

  if (!sessionId) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    document.getElementById('error-msg').textContent = 'Missing payment session. If you paid, sign in to the owner app with your order email.';
    return;
  }

  fetch(cfg.CHECKOUT_API + '?success=1&session_id=' + encodeURIComponent(sessionId))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      loading.classList.add('hidden');
      if (!data.ok || !data.email) {
        error.classList.remove('hidden');
        document.getElementById('error-msg').textContent = data.error || 'Could not confirm payment';
        return;
      }
      var plan = cfg.PLANS[data.plan] || cfg.PLANS.starter;
      document.getElementById('success-email').textContent = data.email;
      document.getElementById('success-email-2').textContent = data.email;
      document.getElementById('success-plan').textContent = plan.name;
      var afterTrial = plan.monthly
        ? 'After your trial, your ' + plan.name + ' plan is £' + plan.monthly + '/month.'
        : 'Your Starter plan stays free forever — up to 50 unique customers per month after your trial.';
      document.getElementById('after-trial').textContent = afterTrial;

      var openApp = document.getElementById('open-app-link');
      if (openApp) {
        openApp.href = appDeepLink(data.email);
        openApp.textContent = 'Open owner app';
      }

      content.classList.remove('hidden');
    })
    .catch(function () {
      loading.classList.add('hidden');
      error.classList.remove('hidden');
      document.getElementById('error-msg').textContent = 'Could not reach server — try refreshing or sign in to the owner app.';
    });
})();
