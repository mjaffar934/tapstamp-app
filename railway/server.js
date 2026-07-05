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

const app = express();

/** Health first — Railway must never wait on Supabase for this. */
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

let apnProvider = null;

function getApnProvider() {
  if (apnProvider) return apnProvider;

  const production = process.env.APNS_PRODUCTION === 'true';

  // Token auth (APNs Auth Key .p8) — matches old Railway setup
  const apnKey = process.env.APN_KEY;
  const apnKeyId = process.env.APN_KEY_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  if (apnKey && apnKeyId && teamId) {
    apnProvider = new apn.Provider({
      token: { key: apnKey, keyId: apnKeyId, teamId },
      production,
    });
    return apnProvider;
  }

  // Certificate auth (Pass Type ID cert) — optional fallback
  const cert = process.env.PASS_CERT;
  const key = process.env.PASS_KEY;
  if (cert && key) {
    apnProvider = new apn.Provider({ cert, key, production });
    return apnProvider;
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
      res.set('Cache-Control', 'no-store');
      res.send(body);
      return;
    }

    res.status(upstream.status).type(contentType || 'text/plain').send(body);
  } catch (err) {
    console.error('Proxy error:', supabasePath, err);
    const code = err?.cause?.code;
    if (code === 'ENOTFOUND' && PROBE_SUPABASE_PATHS.has(supabasePath)) {
      res.status(200).type('html').send('<!DOCTYPE html><html><body>ok</body></html>');
      return;
    }
    res.status(502).send('Upstream error');
  }
}

app.all('/tap/:code', (req, res) => {
  proxyToSupabase(req, res, `/tap/${req.params.code}`, { forceHtml: true });
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

app.get('/google-wallet/:serial', (req, res) => {
  proxyToSupabase(req, res, `/google-wallet/${req.params.serial}`, { followRedirect: false });
});

app.get('/wallet-strip/:serial', (req, res) => {
  proxyToSupabase(req, res, `/wallet-strip/${req.params.serial}`, { binary: true });
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
  res.sendFile(path.join(WEBSITE_ROOT, 'order', 'index.html'));
});

app.get('/order/success', (_req, res) => {
  res.sendFile(path.join(WEBSITE_ROOT, 'order', 'success', 'index.html'));
});

/** Static marketing site — must be last so API routes above take priority */
app.use(express.static(WEBSITE_ROOT, { index: 'index.html', extensions: ['html'] }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TapStamp on :${PORT}`);
  console.log(`  Site:    ${WEBSITE_ROOT}`);
  console.log(`  Supabase: ${SUPABASE_FUNCTIONS}`);
});
