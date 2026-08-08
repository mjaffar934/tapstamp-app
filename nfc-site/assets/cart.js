(function () {
  var KEY = 'tapstamp_nfc_cart_v1';
  var cfg = window.NFC_SHOP || { PRODUCTS: {}, DEALS: {} };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : {};
      return data && typeof data === 'object' ? data : {};
    } catch (_) {
      return {};
    }
  }

  function write(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('nfc-cart-changed'));
  }

  function lines() {
    var cart = read();
    var out = [];
    Object.keys(cart).forEach(function (sku) {
      var qty = Number(cart[sku]) || 0;
      var p = cfg.PRODUCTS[sku];
      if (!p || qty < 1) return;
      out.push({ sku: sku, quantity: qty, product: p });
    });
    return out;
  }

  function totalUnits() {
    return lines().reduce(function (n, l) { return n + l.quantity; }, 0);
  }

  function listTotalGbp() {
    return Math.round(lines().reduce(function (n, l) {
      return n + l.product.priceGbp * l.quantity;
    }, 0) * 100) / 100;
  }

  /** Mirror server deal pricing (pence). */
  function priceCart() {
    var stands = [];
    var epoxies = [];
    var listPence = 0;
    lines().forEach(function (l) {
      var unit = Math.round(l.product.priceGbp * 100);
      listPence += unit * l.quantity;
      for (var i = 0; i < l.quantity; i++) {
        if (l.product.kind === 'stand') stands.push(l.sku);
        else epoxies.push(l.sku);
      }
    });

    var dealPence = 0;
    var labels = [];
    function take(arr, sku) {
      var idx = arr.indexOf(sku);
      if (idx < 0) return false;
      arr.splice(idx, 1);
      return true;
    }

    while (stands.indexOf('google_stand') >= 0 && stands.indexOf('instagram_stand') >= 0) {
      take(stands, 'google_stand');
      take(stands, 'instagram_stand');
      dealPence += 3499;
      labels.push('stand_pair');
    }
    while (epoxies.length >= 2) {
      epoxies.pop();
      epoxies.pop();
      dealPence += 2499;
      labels.push('epoxy_pair');
    }
    while (stands.length >= 1 && epoxies.length >= 1) {
      stands.pop();
      epoxies.pop();
      dealPence += 3299;
      labels.push('mixed');
    }
    stands.forEach(function (sku) {
      dealPence += Math.round(cfg.PRODUCTS[sku].priceGbp * 100);
    });
    epoxies.forEach(function (sku) {
      dealPence += Math.round(cfg.PRODUCTS[sku].priceGbp * 100);
    });

    return {
      listPence: listPence,
      dealPence: dealPence,
      discountPence: Math.max(0, listPence - dealPence),
      labels: labels,
      dealGbp: dealPence / 100,
      listGbp: listPence / 100,
    };
  }

  function totalGbp() {
    return priceCart().dealGbp;
  }

  function compareAtTotal() {
    return Math.round(lines().reduce(function (n, l) {
      return n + l.product.compareAtGbp * l.quantity;
    }, 0) * 100) / 100;
  }

  function setQty(sku, qty) {
    var cart = read();
    qty = Math.max(0, Math.min(20, Number(qty) || 0));
    if (qty <= 0) delete cart[sku];
    else cart[sku] = qty;
    write(cart);
  }

  function add(sku, delta) {
    var cart = read();
    var next = (Number(cart[sku]) || 0) + (delta || 1);
    setQty(sku, next);
  }

  function clear() {
    write({});
  }

  function hasFamily(family) {
    return lines().some(function (l) { return l.product.family === family; });
  }

  function path(href) {
    var prefix = (cfg.PATH_PREFIX || '');
    if (!href) return prefix || '/';
    if (href.indexOf('http') === 0) return href;
    return prefix + href;
  }

  function asset(src) {
    if (!src) return src;
    if (src.indexOf('http') === 0) return src;
    return (cfg.ASSET_BASE || '') + src;
  }

  function money(n) {
    return '£' + Number(n).toFixed(2);
  }

  window.NfcCart = {
    read: read,
    lines: lines,
    totalUnits: totalUnits,
    totalGbp: totalGbp,
    listTotalGbp: listTotalGbp,
    compareAtTotal: compareAtTotal,
    priceCart: priceCart,
    setQty: setQty,
    add: add,
    clear: clear,
    hasFamily: hasFamily,
    path: path,
    asset: asset,
    money: money,
  };
})();
