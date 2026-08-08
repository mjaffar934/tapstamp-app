/**
 * TapStamp Railway — marketing site + API proxy (no Supabase Pro required)
 *
 * Static: website/ (tapstamp.co)
 * Proxy:  /tap/* /pass/* /wallet/* /push-update → Supabase edge functions
 */

const dns = require('dns');
// Railway SFO sometimes fails to resolve *.supabase.co via default resolver
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
const express = require('express');
const apn = require('@parse/node-apn');

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_FUNCTIONS =
  (process.env.SUPABASE_FUNCTIONS_URL || '').replace(/\/$/, '') ||
  'https://biootanbxmqfserzgnxe.supabase.co/functions/v1';
const WEBSITE_ROOT = (() => {
  const sibling = path.join(__dirname, '..', 'website');
  const bundled = path.join(__dirname, 'website');
  if (fs.existsSync(sibling)) return sibling;
  if (fs.existsSync(bundled)) return bundled;
  return sibling;
})();

const NFC_SITE_ROOT = (() => {
  const sibling = path.join(__dirname, '..', 'nfc-site');
  const bundled = path.join(__dirname, 'nfc-site');
  if (fs.existsSync(sibling)) return sibling;
  if (fs.existsSync(bundled)) return bundled;
  return sibling;
})();

/** Host for dedicated NFC shop (e.g. stands.tapstamp.co). Comma-separated allowed. */
const NFC_SITE_HOSTS = String(process.env.NFC_SITE_HOST || 'stands.tapstamp.co')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function requestHost(req) {
  const raw = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  return raw.split(',')[0].trim().toLowerCase().split(':')[0];
}

function isNfcHost(req) {
  return NFC_SITE_HOSTS.includes(requestHost(req));
}

function nfcPublicOrigin(req) {
  if (isNfcHost(req)) {
    const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0].trim();
    return `${proto}://${requestHost(req)}`;
  }
  const loyalty = (process.env.ORDER_WEBSITE_URL || 'https://tapstamp.co').replace(/\/$/, '');
  return `${loyalty}/reviews`;
}

function sendNfcFile(res, relPath, options = {}) {
  const filePath = path.join(NFC_SITE_ROOT, relPath);
  if (!filePath.startsWith(NFC_SITE_ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }
  const isHtml = filePath.endsWith('.html');
  res.set('Cache-Control', isHtml
    ? 'no-store, no-cache, must-revalidate'
    : 'public, max-age=3600');

  // Under /reviews, absolute /assets hits the loyalty site CSS — rewrite before send.
  if (isHtml && options.assetPrefix) {
    let html = fs.readFileSync(filePath, 'utf8');
    const prefix = options.assetPrefix.replace(/\/$/, '');
    html = html
      .replace(/(href|src)="\/assets\//g, `$1="${prefix}/assets/`)
      .replace(/(href|src)="\/favicon\.svg/g, `$1="${prefix}/favicon.svg`);
    if (!html.includes('<base ')) {
      html = html.replace(
        '<head>',
        `<head>\n  <base href="${prefix}/">`,
      );
    }
    res.type('html').send(html);
    return true;
  }

  res.sendFile(filePath);
  return true;
}

function serveNfcPath(req, res, urlPath, options = {}) {
  let rel = urlPath.replace(/^\/+/, '') || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (!path.extname(rel)) {
    const asIndex = path.join(rel, 'index.html');
    if (fs.existsSync(path.join(NFC_SITE_ROOT, asIndex))) rel = asIndex;
    else if (fs.existsSync(path.join(NFC_SITE_ROOT, `${rel}.html`))) rel = `${rel}.html`;
  }
  if (!sendNfcFile(res, rel, options)) {
    res.status(404).type('text').send('Not found');
  }
}

const app = express();

/** Health first — Railway must never wait on Supabase for this. */
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Stripe webhooks need the exact raw body for signature verification.
 * Register BEFORE express.json() so the payload is not re-serialized.
 * Dashboard URL: https://tapstamp.co/webhook/stripe → Supabase stripe-webhook
 */
app.post(
  '/webhook/stripe',
  express.raw({ type: '*/*', limit: '2mb' }),
  async (req, res) => {
    const target = `${SUPABASE_FUNCTIONS}/stripe-webhook`;
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).send('Missing stripe-signature');
    }

    try {
      const upstream = await fetch(target, {
        method: 'POST',
        headers: {
          'content-type': req.headers['content-type'] || 'application/json',
          'stripe-signature': Array.isArray(signature) ? signature[0] : signature,
        },
        body: req.body,
        signal: AbortSignal.timeout(25000),
      });
      const text = await upstream.text();
      res.status(upstream.status).type(upstream.headers.get('content-type') || 'text/plain').send(text);
    } catch (err) {
      console.error('Stripe webhook proxy error:', err);
      res.status(502).send('Upstream error');
    }
  },
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

let apnProvider = null;
let apnProviderFailed = false;

function normalizePem(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, '\n').trim() : '';
}

function getApnProvider() {
  if (apnProvider) return apnProvider;
  if (apnProviderFailed) return null;

  try {
    const production = process.env.APNS_PRODUCTION !== 'false';

    // Certificate auth (Pass Type ID cert) — preferred for Wallet pass updates
    const cert = normalizePem(process.env.PASS_CERT);
    const key = normalizePem(process.env.PASS_KEY);
    if (cert && key) {
      apnProvider = new apn.Provider({ cert, key, production });
      return apnProvider;
    }

    // Token auth (APNs Auth Key .p8)
    const apnKey = normalizePem(process.env.APN_KEY);
    const apnKeyId = process.env.APN_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    if (apnKey && apnKeyId && teamId) {
      apnProvider = new apn.Provider({
        token: { key: apnKey, keyId: apnKeyId, teamId },
        production,
      });
      return apnProvider;
    }
  } catch (err) {
    apnProviderFailed = true;
    console.error('APNs provider init failed:', err);
    return null;
  }

  return null;
}

const PROBE_SUPABASE_PATHS = new Set([
  '/tap/INVALID',
  '/tap/TS0007',
  '/pass/00000000-0000-0000-0000-000000000000',
]);

async function proxyToSupabase(req, res, supabasePath, options = {}) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${SUPABASE_FUNCTIONS}${supabasePath}${qs}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const init = {
    method: req.method,
    headers,
    redirect: options.followRedirect === false ? 'manual' : 'follow',
    signal: AbortSignal.timeout(25000),
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.is('application/json')) {
      init.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    } else if (req.body && typeof req.body === 'object') {
      init.body = new URLSearchParams(req.body).toString();
      headers['content-type'] = 'application/x-www-form-urlencoded';
    }
  }

  try {
    const upstream = await fetch(target, init);

    if (options.followRedirect === false && upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      const setCookie = upstream.headers.get('set-cookie');
      if (setCookie) res.set('Set-Cookie', setCookie);
      if (location) return res.redirect(upstream.status, location);
    }

    const contentType = upstream.headers.get('content-type') || '';
    const body = options.binary ? Buffer.from(await upstream.arrayBuffer()) : await upstream.text();

    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) res.set('Set-Cookie', setCookie);

    if (options.forceHtml) {
      res.status(upstream.status).type('html').send(body);
      return;
    }

    // Supabase *.co often returns HTML as text/plain — fix so iPhone Safari renders it
    if (!options.binary && typeof body === 'string') {
      const trimmed = body.trimStart();
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        res.status(upstream.status).type('html').send(body);
        return;
      }
    }

    if (options.binary || contentType.includes('pkpass') || contentType.includes('octet-stream')) {
      res.status(upstream.status);
      if (contentType) res.set('Content-Type', contentType);
      const disposition = upstream.headers.get('content-disposition');
      if (disposition) res.set('Content-Disposition', disposition);
      const lastModified = upstream.headers.get('last-modified');
      if (lastModified) res.set('Last-Modified', lastModified);
      res.set('Cache-Control', 'no-store');
      res.send(body);
      return;
    }

    res.status(upstream.status).type(contentType || 'text/plain').send(body);
  } catch (err) {
    console.error('Proxy error:', supabasePath, err);
    const code = err?.cause?.code ?? err?.code;
    if (code === 'ENOTFOUND' && PROBE_SUPABASE_PATHS.has(supabasePath)) {
      res.status(200).type('html').send('<!DOCTYPE html><html><body>ok</body></html>');
      return;
    }
    if (err?.name === 'TimeoutError' || code === 'ABORT_ERR') {
      res.status(504).send('Upstream timeout');
      return;
    }
    res.status(502).send('Upstream error');
  }
}

app.all('/tap/:code', (req, res) => {
  proxyToSupabase(req, res, `/tap/${req.params.code}`, { forceHtml: true, followRedirect: false });
});

app.get('/pass/:serial', (req, res) => {
  proxyToSupabase(req, res, `/pass/${req.params.serial}`, { binary: true });
});

app.get('/wallet/:serial', (req, res) => {
  proxyToSupabase(req, res, `/wallet/${req.params.serial}`, { followRedirect: false, forceHtml: true });
});

app.post('/save-customer', (req, res) => {
  proxyToSupabase(req, res, '/save-customer', { followRedirect: false });
});

app.get('/google-wallet', (req, res) => {
  proxyToSupabase(req, res, '/google-wallet/', { followRedirect: false });
});

app.get('/google-wallet/:serial', (req, res) => {
  proxyToSupabase(req, res, `/google-wallet/${req.params.serial}`, { followRedirect: false });
});

app.get('/wallet-strip/:serial', (req, res) => {
  proxyToSupabase(req, res, `/wallet-strip/${req.params.serial}`, { binary: true });
});

/** Website checkout — keep browser on tapstamp.co (never expose *.supabase.co). */
app.post('/order-checkout', (req, res) => {
  proxyToSupabase(req, res, '/order-checkout', { followRedirect: false });
});

app.post('/api/order-checkout', (req, res) => {
  proxyToSupabase(req, res, '/order-checkout', { followRedirect: false });
});

app.get('/order-checkout', (req, res) => {
  proxyToSupabase(req, res, '/order-checkout', { followRedirect: false });
});

/** NFC stands / epoxy one-time shop */
app.post('/hardware-checkout', (req, res) => {
  proxyToSupabase(req, res, '/hardware-checkout', { followRedirect: false });
});

app.get('/hardware-checkout', (req, res) => {
  proxyToSupabase(req, res, '/hardware-checkout', { followRedirect: false });
});

/** NFC shop contact / support form */
app.post('/nfc-contact', express.json({ limit: '32kb' }), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim();
  const business = String(req.body?.business || '').trim();
  const topic = String(req.body?.topic || 'other').trim();
  if (!name || !email.includes('@') || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  console.log('[nfc-contact]', {
    name,
    email,
    topic,
    business: business || undefined,
    message: message.slice(0, 400),
  });

  // Best-effort forward to inbox (FormSubmit). First use may need inbox confirmation.
  try {
    const forward = await fetch('https://formsubmit.co/ajax/support@tapstamp.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name,
        email,
        message,
        business,
        topic,
        _subject: `NFC support — ${topic}`,
        _template: 'table',
      }),
    });
    if (!forward.ok) {
      console.warn('[nfc-contact] formsubmit status', forward.status);
    }
  } catch (err) {
    console.warn('[nfc-contact] forward failed', err?.message || err);
  }

  res.json({ ok: true });
});

/** Apple PassKit web service (device registration + pass updates) */
app.all(/^\/passkit-register(\/.*)?$/, (req, res) => {
  const suffix = req.path.replace(/^\/passkit-register/, '') || '';
  const isPassFetch = /^\/v1\/passes\//.test(suffix);
  proxyToSupabase(req, res, `/passkit-register${suffix}`, {
    binary: isPassFetch && req.method === 'GET',
  });
});

app.post('/push-update', async (req, res) => {
  const pushToken = req.body?.pushToken || req.body?.push_token;
  if (!pushToken) {
    return res.status(400).json({ error: 'pushToken required' });
  }

  const provider = getApnProvider();
  if (!provider) {
    console.warn('APNs not configured');
    return res.status(503).json({ error: 'APNs not configured' });
  }

  const note = new apn.Notification();
  note.contentAvailable = true;
  note.topic = process.env.PASS_TYPE_ID || 'pass.com.tapstamp.loyalty';
  note.payload = {};

  try {
    const result = await provider.send(note, pushToken);
    if (result.failed?.length) {
      console.error('APNs failed:', result.failed);
      return res.status(500).json({ error: 'APNs send failed', failed: result.failed });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('APNs error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/** Order pages (clean URLs without .html) */
app.get('/order', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'order', 'index.html'));
});

app.get('/order/success', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'order', 'success', 'index.html'));
});

app.get('/support', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'support', 'index.html'));
});

app.get('/privacy', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'privacy', 'index.html'));
});

app.get('/loyalty', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'loyalty', 'index.html'));
});

app.get('/pricing', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEBSITE_ROOT, 'pricing', 'index.html'));
});

/** Legacy NFC paths on loyalty domain → NFC shop */
app.get(['/google', '/instagram', '/hardware', '/shop', '/shop/success'], (req, res) => {
  return res.redirect(301, `${nfcPublicOrigin(req)}/`);
});

/** Preview mount: tapstamp.co/reviews/* → nfc-site */
app.use('/reviews', (req, res, next) => {
  if (isNfcHost(req)) return next();
  const sub = req.path === '/' ? '/index.html' : req.path;
  serveNfcPath(req, res, sub, { assetPrefix: '/reviews' });
});

/** Dedicated NFC host (stands.tapstamp.co etc.) */
app.use((req, res, next) => {
  if (!isNfcHost(req)) return next();
  serveNfcPath(req, res, req.path);
});

/** Static loyalty marketing site — must be after API + NFC mounts */
app.use(
  express.static(WEBSITE_ROOT, {
    index: 'index.html',
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  }),
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TapStamp on :${PORT}`);
  console.log(`  Loyalty: ${WEBSITE_ROOT}`);
  console.log(`  NFC:     ${NFC_SITE_ROOT}`);
  console.log(`  NFC host(s): ${NFC_SITE_HOSTS.join(', ') || '(none)'}`);
  console.log(`  Supabase: ${SUPABASE_FUNCTIONS}`);
});
