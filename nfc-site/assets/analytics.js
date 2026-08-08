(function () {
  var cfg = window.NFC_SHOP || {};
  var id = cfg.GA_MEASUREMENT_ID || '';

  function noop() {}

  window.NfcAnalytics = {
    ready: false,
    pageView: noop,
    event: noop,
  };

  if (!id || id.indexOf('G-') !== 0) {
    return;
  }

  // GA4 loader
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { send_page_view: false });

  function pageView(path) {
    gtag('event', 'page_view', {
      page_path: path || (location.pathname + location.search),
      page_title: document.title,
    });
  }

  function event(name, params) {
    gtag('event', name, params || {});
  }

  window.NfcAnalytics = {
    ready: true,
    pageView: pageView,
    event: event,
  };

  pageView();
})();
