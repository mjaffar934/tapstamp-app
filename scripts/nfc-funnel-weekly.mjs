/**
 * Weekly NFC → loyalty funnel snapshot (M1 durable numerator/denominator).
 *
 * Uses Stripe Checkout Session metadata:
 *   hardware paid: metadata.purpose === 'hardware_shop' && payment_status paid
 *   loyalty NFC:   metadata.signup_source === 'nfc' (setup or payment complete)
 *
 *   STRIPE_SECRET_KEY=sk_live_… node scripts/nfc-funnel-weekly.mjs
 *   STRIPE_SECRET_KEY=sk_live_… DAYS=30 node scripts/nfc-funnel-weekly.mjs
 *   STRIPE_SECRET_KEY=sk_live_… DAYS=7 CSV=1 node scripts/nfc-funnel-weekly.mjs > /tmp/nfc-funnel.csv
 *
 * M2 / M3 live in GA4 (G-77R50KF8Q5) — see docs/NFC_LOYALTY_UPSELL.md § Metrics.
 */
const KEY = process.env.STRIPE_SECRET_KEY || '';
const DAYS = Math.max(1, Number(process.env.DAYS || 7));
const CSV = process.env.CSV === '1' || process.argv.includes('--csv');

if (!KEY.startsWith('sk_')) {
  console.error('Set STRIPE_SECRET_KEY=sk_live_… (or sk_test_…) and re-run.');
  process.exit(1);
}

const sinceSec = Math.floor(Date.now() / 1000) - DAYS * 86400;

async function stripeGet(pathWithQuery) {
  const res = await fetch(`https://api.stripe.com/v1${pathWithQuery}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data;
}

async function listSessions() {
  const out = [];
  let starting_after;
  for (;;) {
    const q = new URLSearchParams({
      limit: '100',
      'created[gte]': String(sinceSec),
    });
    if (starting_after) q.set('starting_after', starting_after);
    const page = await stripeGet(`/checkout/sessions?${q}`);
    out.push(...(page.data || []));
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return out;
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const sessions = await listSessions();

const hardwarePaid = sessions.filter((s) => {
  const purpose = s.metadata?.purpose;
  return purpose === 'hardware_shop' && s.payment_status === 'paid' && s.status === 'complete';
});

const loyaltyNfc = sessions.filter((s) => {
  if (s.metadata?.signup_source !== 'nfc') return false;
  // setup mode (card on file) or paid payment
  if (s.mode === 'setup') return s.status === 'complete';
  return s.payment_status === 'paid' && s.status === 'complete';
});

const emailAttributed = loyaltyNfc.filter((s) => {
  const day = s.metadata?.nfc_email_day;
  return day === '0' || day === '2' || day === '7';
});

const m1 = hardwarePaid.length
  ? (loyaltyNfc.length / hardwarePaid.length)
  : null;

if (CSV) {
  const rows = [
    [
      'kind',
      'session_id',
      'created_iso',
      'email',
      'sku_or_plan',
      'signup_source',
      'nfc_channel',
      'nfc_email_day',
      'mode',
      'status',
    ],
  ];
  for (const s of hardwarePaid) {
    rows.push([
      'hardware_paid',
      s.id,
      new Date(s.created * 1000).toISOString(),
      s.customer_details?.email || s.customer_email || s.metadata?.email || '',
      s.metadata?.sku || '',
      '',
      '',
      '',
      s.mode,
      s.status,
    ]);
  }
  for (const s of loyaltyNfc) {
    rows.push([
      'loyalty_nfc',
      s.id,
      new Date(s.created * 1000).toISOString(),
      s.customer_details?.email || s.customer_email || s.metadata?.email || '',
      s.metadata?.plan || '',
      s.metadata?.signup_source || '',
      s.metadata?.nfc_channel || '',
      s.metadata?.nfc_email_day || '',
      s.mode,
      s.status,
    ]);
  }
  process.stdout.write(rows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n');
} else {
  console.log(`NFC funnel snapshot (last ${DAYS}d, created >= ${new Date(sinceSec * 1000).toISOString()})`);
  console.log(`  M1 denom — hardware paid sessions: ${hardwarePaid.length}`);
  console.log(`  M1 numer — loyalty signup_source=nfc: ${loyaltyNfc.length}`);
  console.log(`  M1 ratio (crude same-window): ${m1 == null ? 'n/a' : (m1 * 100).toFixed(1) + '%'}`);
  console.log(`  M3 hint — loyalty with nfc_email_day set: ${emailAttributed.length}`);
  console.log('');
  console.log('Notes:');
  console.log('  - True M1 (≥25% within 7d of hardware purchase) needs email-level join; use CSV=1 and match emails.');
  console.log('  - M2 CTR = nfc_loyalty_cta_click / nfc_success_view in GA4 property G-77R50KF8Q5.');
  console.log('  - M3 CTR = nfc_loyalty_signup_complete (email_day set) / nfc_email_click in GA4.');
}

