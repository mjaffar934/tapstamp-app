(function () {
  var cfg = window.NFC_SHOP;
  var cart = window.NfcCart;
  if (!cfg || !cart) return;

  var analytics = window.NfcAnalytics || { event: function () {}, pageView: function () {} };

  var params = new URLSearchParams(location.search);
  if (params.get('canceled') === '1') {
    var info = document.getElementById('alert-canceled');
    if (info) info.classList.remove('hidden');
  }

  var skuParam = params.get('sku');
  if (skuParam && cfg.PRODUCTS[skuParam] && cart.totalUnits() === 0) {
    cart.setQty(skuParam, 1);
  }

  function toggleGoogleLookup() {
    var urlEl = document.getElementById('google_url');
    var lookup = document.getElementById('google-lookup-fields');
    var orEl = document.getElementById('google-or');
    if (!urlEl || !lookup) return;
    var hasUrl = String(urlEl.value || '').trim().length > 8;
    lookup.classList.toggle('hidden', hasUrl);
    if (orEl) orEl.classList.toggle('hidden', hasUrl);
  }

  function renderCart() {
    var box = document.getElementById('cart-lines');
    var lines = cart.lines();
    if (!box) return;

    if (!lines.length) {
      box.innerHTML = '<p class="empty">Cart is empty. <a data-link="/products" style="color:var(--gold)">Shop products</a></p>';
      document.querySelectorAll('[data-link]').forEach(function (a) {
        a.href = cart.path(a.getAttribute('data-link'));
      });
    } else {
      box.innerHTML = lines.map(function (l) {
        return (
          '<div class="line" data-sku="' + l.sku + '">' +
          '<img src="' + cart.asset(l.product.image) + '" alt="">' +
          '<div><h3>' + l.product.name + '</h3>' +
          '<p>' + cart.money(l.product.priceGbp) + '</p>' +
          '<div class="qty">' +
          '<button type="button" data-act="dec">−</button>' +
          '<span>' + l.quantity + '</span>' +
          '<button type="button" data-act="inc">+</button>' +
          '</div></div>' +
          '<strong>' + cart.money(l.product.priceGbp * l.quantity) + '</strong></div>'
        );
      }).join('');
    }

    var units = cart.totalUnits();
    var priced = cart.priceCart();
    var elWas = document.getElementById('sum-was');
    var elNow = document.getElementById('sum-now');
    var elSave = document.getElementById('sum-save');
    if (elWas) elWas.textContent = cart.money(priced.listGbp);
    if (elNow) elNow.textContent = cart.money(priced.dealGbp);
    if (elSave) elSave.textContent = cart.money(priced.discountPence / 100);

    var win = document.getElementById('delivery-win');
    var nudge = document.getElementById('delivery-nudge');
    if (win && nudge) {
      win.classList.toggle('hidden', units < 2);
      nudge.classList.toggle('hidden', units !== 1);
    }

    var dealNote = document.getElementById('deal-note');
    if (dealNote) {
      if (priced.discountPence > 0) {
        dealNote.textContent = 'Deal applied — you save ' + cart.money(priced.discountPence / 100);
        dealNote.classList.remove('hidden');
      } else {
        dealNote.classList.add('hidden');
      }
    }

    var needsGoogle = cart.hasFamily('google');
    var needsIg = cart.hasFamily('instagram');
    var googleBlock = document.getElementById('google-fields');
    var igBlock = document.getElementById('instagram-fields');
    if (googleBlock) googleBlock.classList.toggle('hidden', !needsGoogle);
    if (igBlock) igBlock.classList.toggle('hidden', !needsIg);

    var igInput = document.getElementById('instagram_handle');
    if (igInput) igInput.required = needsIg;

    toggleGoogleLookup();

    var submit = document.getElementById('submit-btn');
    if (submit) submit.disabled = units < 1;
  }

  var linesEl = document.getElementById('cart-lines');
  if (linesEl) {
    linesEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var line = btn.closest('[data-sku]');
      if (!line) return;
      var sku = line.getAttribute('data-sku');
      var current = Number(cart.read()[sku]) || 0;
      if (btn.getAttribute('data-act') === 'inc') cart.setQty(sku, current + 1);
      if (btn.getAttribute('data-act') === 'dec') cart.setQty(sku, current - 1);
    });
  }

  var googleUrlInput = document.getElementById('google_url');
  if (googleUrlInput) {
    googleUrlInput.addEventListener('input', toggleGoogleLookup);
    googleUrlInput.addEventListener('change', toggleGoogleLookup);
  }

  window.addEventListener('nfc-cart-changed', renderCart);
  renderCart();

  analytics.event('view_cart', {
    currency: 'GBP',
    value: cart.priceCart().dealGbp,
  });

  var form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var err = document.getElementById('alert-error');
    err.classList.add('hidden');
    var lines = cart.lines();
    if (!lines.length) {
      err.textContent = 'Add at least one product';
      err.classList.remove('hidden');
      return;
    }

    var delivery = (document.querySelector('input[name="delivery_method"]:checked') || {}).value || 'uk_post';
    var googleUrl = String((document.getElementById('google_url') || {}).value || '').trim();
    var businessName = String((document.getElementById('business_name') || {}).value || '').trim();
    var businessAddress = String((document.getElementById('shipping_address_line1') || {}).value || '').trim();
    var instagramHandle = String((document.getElementById('instagram_handle') || {}).value || '').trim();

    var body = {
      site: 'nfc',
      items: lines.map(function (l) { return { sku: l.sku, quantity: l.quantity }; }),
      delivery_method: delivery,
    };

    if (cart.hasFamily('google')) {
      if (googleUrl) {
        body.google_url = googleUrl;
        if (businessName) body.business_name = businessName;
      } else {
        if (!businessName || !businessAddress) {
          err.textContent = 'Add a Google review URL, or your business name and address';
          err.classList.remove('hidden');
          return;
        }
        body.google_business_lookup = true;
        body.business_name = businessName;
        body.shipping_address_line1 = businessAddress;
      }
    }

    if (cart.hasFamily('instagram')) {
      if (!instagramHandle) {
        err.textContent = 'Add your Instagram @';
        err.classList.remove('hidden');
        return;
      }
      body.instagram_handle = instagramHandle;
      if (businessName) body.business_name = businessName;
    }

    if (cfg.PATH_PREFIX === '/reviews') {
      body.success_base = location.origin + '/reviews/checkout/success';
      body.cancel_base = location.origin + '/reviews/checkout';
    } else {
      body.success_base = location.origin + '/checkout/success';
      body.cancel_base = location.origin + '/checkout';
    }

    var priced = cart.priceCart();
    analytics.event('begin_checkout', {
      currency: 'GBP',
      value: priced.dealGbp,
      items: lines.map(function (l) {
        return {
          item_id: l.sku,
          item_name: l.product.name,
          price: l.product.priceGbp,
          quantity: l.quantity,
        };
      }),
    });

    var btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Redirecting to Stripe…';

    try {
      var res = await fetch(cfg.CHECKOUT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Could not start checkout');
      }
      location.href = data.checkoutUrl;
    } catch (ex) {
      err.textContent = ex.message || 'Something went wrong';
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Continue to secure payment';
    }
  });
})();
