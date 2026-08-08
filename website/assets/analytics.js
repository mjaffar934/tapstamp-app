/**
 * Loyalty-site funnel analytics — same GA4 property as NFC shop (G-77R50KF8Q5)
 * so M1–M3 events land in one Explore / weekly export path.
 */
(function () {
  var cfg = window.TAPSTAMP || {};
  var id = cfg.GA_MEASUREMENT_ID || '';

  function noop() {}

  window.TapstampAnalytics = {
    ready: false,
    pageView: noop,
    event: noop,
  };

  if (!id || id.indexOf('G-') !== 0) {
    return;
  }

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

  window.TapstampAnalytics = {
    ready: true,
    pageView: pageView,
    event: event,
  };

  pageView();
})();
