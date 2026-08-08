/**
 * Offer A Day 0 / 2 / 7 NFC hardware → loyalty nurture (MJ-26).
 * Copy source: MJ-20 offer-a-emails (CoS-approved).
 * Deep-link contract: docs/NFC_LOYALTY_UPSELL.md (email_day + nfc_channel).
 */

import { supabase } from './client.ts';
import {
  isNurtureEmailEnabled,
  sendTransactionalEmail,
} from './email.ts';

export type NurtureDay = 0 | 2 | 7;

export interface NurtureBuyer {
  email: string;
  businessName?: string | null;
  nfcSku?: string | null;
  stripeCheckoutSessionId: string;
}

const DAY_OFFSET_MS: Record<NurtureDay, number> = {
  0: 0,
  2: 2 * 24 * 60 * 60 * 1000,
  7: 7 * 24 * 60 * 60 * 1000,
};

export function normalizeBuyerEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? '';
  return trimmed.includes('@') ? trimmed : null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function displayBusinessName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'your shop';
}

/** Build /order deep link (omit empty params). */
export function buildLoyaltyCtaUrl(params: {
  email: string;
  businessName?: string | null;
  nfcSku?: string | null;
  emailDay: NurtureDay;
  website?: string;
}): string {
  const base = (params.website ?? Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co')
    .replace(/\/$/, '');
  const qs = new URLSearchParams();
  qs.set('from', 'nfc');
  qs.set('plan', 'pro');
  qs.set('email_day', String(params.emailDay));
  qs.set('nfc_channel', `email_day_${params.emailDay}`);
  const email = normalizeBuyerEmail(params.email);
  if (email) qs.set('email', email);
  const business = params.businessName?.trim();
  if (business) qs.set('business_name', business);
  const sku = params.nfcSku?.trim();
  if (sku) qs.set('nfc_sku', sku.slice(0, 80));
  return `${base}/order?${qs.toString()}`;
}

export interface RenderedNurtureEmail {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  ctaUrl: string;
  ctaLabel: string;
}

export function renderNurtureEmail(
  day: NurtureDay,
  params: {
    businessName?: string | null;
    email: string;
    nfcSku?: string | null;
    website?: string;
  },
): RenderedNurtureEmail {
  const shop = displayBusinessName(params.businessName);
  const ctaUrl = buildLoyaltyCtaUrl({
    email: params.email,
    businessName: params.businessName,
    nfcSku: params.nfcSku,
    emailDay: day,
    website: params.website,
  });

  if (day === 0) {
    const subject = 'Your NFC is confirmed — add Wallet stamps next?';
    const previewText =
      'Your Google/Instagram NFC is in. Next: free loyalty stamp + software £0 until 50 customers/mo.';
    const ctaLabel = 'Start stamp loyalty — £0 today →';
    const text = [
      `Hi ${shop},`,
      '',
      'Your NFC order is confirmed. We’ll program it for Google reviews or Instagram as you chose at checkout.',
      '',
      'Different chip, same brand: that card opens a link. Stamp loyalty is a second NFC that adds stamps to your customer’s Apple Wallet card when they tap (/tap/{CODE} once their loyalty stamp ships).',
      '',
      'Included when you start loyalty:',
      '- Free loyalty stamp (ships separately from this reviews/Instagram order)',
      '- Owner account for your team',
      '- Software £0 until 50 unique customers in a month — then Pro is £25/mo if you’re still growing (Multi £59 for more locations)',
      '',
      'No customer app to download. They add a pass to Apple Wallet. Google Wallet is limited until Google finishes our publishing review — we won’t pretend every Android phone can save yet.',
      '',
      `${ctaLabel}`,
      ctaUrl,
      '',
      'Takes about a minute on the order page. Use the same business email so everything stays under one login.',
      '',
      'Questions? Reply to this email.',
      '',
      '— TapStamp',
    ].join('\n');

    const html = wrapHtml({
      previewText,
      shop,
      ctaUrl,
      ctaLabel,
      bodyHtml: `
        <p>Your NFC order is confirmed. We’ll program it for Google reviews or Instagram as you chose at checkout.</p>
        <p><strong>Different chip, same brand:</strong> that card opens a link. Stamp loyalty is a second NFC that adds stamps to your customer’s <strong>Apple Wallet</strong> card when they tap (<code>/tap/{CODE}</code> once their loyalty stamp ships).</p>
        <p>Included when you start loyalty:</p>
        <ul>
          <li>Free loyalty stamp (ships separately from this reviews/Instagram order)</li>
          <li>Owner account for your team</li>
          <li>Software <strong>£0 until 50 unique customers in a month</strong> — then Pro is £25/mo if you’re still growing (Multi £59 for more locations)</li>
        </ul>
        <p>No customer app to download. They add a pass to Apple Wallet. Google Wallet is limited until Google finishes our publishing review — we won’t pretend every Android phone can save yet.</p>
        <p style="margin:0 0 1.25rem">Takes about a minute on the order page. Use the same business email so everything stays under one login.</p>
      `,
    });
    return { subject, previewText, html, text, ctaUrl, ctaLabel };
  }

  if (day === 2) {
    const subject = 'Reviews get the visit. Stamps get the return.';
    const previewText =
      'The NFC you ordered opens reviews or Instagram. Stamp loyalty is the separate tap that brings regulars back.';
    const ctaLabel = 'Add stamps for return visits →';
    const text = [
      `Hi ${shop},`,
      '',
      'Quick distinction most owners miss:',
      '',
      'What you ordered — Google / Instagram NFC: Opens a URL — great for new discovery',
      'Stamp loyalty NFC: One tap adds a stamp on their Wallet card — built for return visits',
      '',
      'Same TapStamp brand. Different chips. Your reviews/Instagram order stays exactly as programmed.',
      '',
      'If you’re thinking “I already paid for NFC, I’m done” — you’re done with the discovery card. You’re not done with a system that tracks who came back.',
      '',
      'Start loyalty when you’re ready:',
      '- Free loyalty stamp included',
      '- Software £0 until 50 unique customers/mo',
      '- Card on file for Pro later — £0 today, no surprise charge this week',
      '',
      `${ctaLabel}`,
      ctaUrl,
      '',
      '— TapStamp',
    ].join('\n');

    const html = wrapHtml({
      previewText,
      shop,
      ctaUrl,
      ctaLabel,
      bodyHtml: `
        <p>Quick distinction most owners miss:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 1rem;border-collapse:collapse">
          <tr>
            <td style="padding:0.6rem 0.75rem;border:1px solid #e5e5e5;vertical-align:top">
              <strong>Google / Instagram NFC</strong><br/>
              Opens a URL — great for new discovery
            </td>
          </tr>
          <tr>
            <td style="padding:0.6rem 0.75rem;border:1px solid #e5e5e5;border-top:0;vertical-align:top">
              <strong>Stamp loyalty NFC</strong><br/>
              One tap adds a stamp on their <strong>Wallet</strong> card — built for return visits
            </td>
          </tr>
        </table>
        <p>Same TapStamp brand. <strong>Different chips.</strong> Your reviews/Instagram order stays exactly as programmed.</p>
        <p>If you’re thinking “I already paid for NFC, I’m done” — you’re done with the discovery card. You’re not done with a system that tracks who came back.</p>
        <p>Start loyalty when you’re ready:</p>
        <ul>
          <li>Free loyalty stamp included</li>
          <li>Software <strong>£0 until 50 unique customers/mo</strong></li>
          <li>Card on file for Pro later — <strong>£0 today</strong>, no surprise charge this week</li>
        </ul>
      `,
    });
    return { subject, previewText, html, text, ctaUrl, ctaLabel };
  }

  // Day 7 — no fake urgency
  const subject = 'Still £0 to start stamp loyalty';
  const previewText =
    'Card on file for later. Charged only after 50 unique customers in a month. No fake countdown.';
  const ctaLabel = 'Start free until 50 customers →';
  const text = [
    `Hi ${shop},`,
    '',
    'Last note from us about stamp loyalty — then we’ll stop so your inbox stays quiet.',
    '',
    'How pricing actually works',
    '1. Start today → £0',
    '2. You get a free loyalty stamp + owner login',
    '3. Software stays free while you’re under 50 unique customers in a calendar month',
    '4. Over 50? Pro is £25/mo (Multi £59/mo for multi-location). We take a card at signup so we can bill only if you hit that — not to surprise you on day two.',
    '',
    'This is not a free trial that auto-converts with a hidden date. There’s no “offer ends Sunday.” When you want return visits on Wallet, start; if not, your reviews/Instagram NFC still does its job.',
    '',
    'Customers don’t download a TapStamp app. They tap your loyalty stamp and add their card to Apple Wallet. Google Wallet remains limited until Google approves public saves — Apple path is the reliable one to promise today.',
    '',
    `${ctaLabel}`,
    ctaUrl,
    '',
    'Not now — keep your reviews NFC as ordered. We’ll leave you alone after this email.',
    '',
    '— TapStamp',
  ].join('\n');

  const html = wrapHtml({
    previewText,
    shop,
    ctaUrl,
    ctaLabel,
    bodyHtml: `
      <p>Last note from us about stamp loyalty — then we’ll stop so your inbox stays quiet.</p>
      <p><strong>How pricing actually works</strong></p>
      <ol>
        <li>Start today → <strong>£0</strong></li>
        <li>You get a free loyalty stamp + owner login</li>
        <li>Software stays free while you’re under <strong>50 unique customers in a calendar month</strong></li>
        <li>Over 50? Pro is <strong>£25/mo</strong> (Multi <strong>£59/mo</strong> for multi-location). We take a card at signup so we can bill only if you hit that — not to surprise you on day two.</li>
      </ol>
      <p>This is <strong>not</strong> a free trial that auto-converts with a hidden date. There’s no “offer ends Sunday.” When you want return visits on Wallet, start; if not, your reviews/Instagram NFC still does its job.</p>
      <p>Customers don’t download a TapStamp app. They tap your loyalty stamp and add their card to <strong>Apple Wallet</strong>. Google Wallet remains limited until Google approves public saves — Apple path is the reliable one to promise today.</p>
      <p style="margin:1rem 0 0;color:#555;font-size:14px">Not now — keep your reviews NFC as ordered. We’ll leave you alone after this email.</p>
    `,
    secondaryNote: true,
  });
  return { subject, previewText, html, text, ctaUrl, ctaLabel };
}

function wrapHtml(opts: {
  previewText: string;
  shop: string;
  ctaUrl: string;
  ctaLabel: string;
  bodyHtml: string;
  secondaryNote?: boolean;
}): string {
  const shop = escapeHtml(opts.shop);
  const ctaUrl = escapeHtml(opts.ctaUrl);
  const ctaLabel = escapeHtml(opts.ctaLabel);
  const preview = escapeHtml(opts.previewText);
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4f1;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
  <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;padding:28px 24px;border-radius:8px">
        <tr><td>
          <p style="margin:0 0 1.25rem;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#666">TapStamp</p>
          <p style="margin:0 0 1rem;font-size:16px;line-height:1.5">Hi ${shop},</p>
          <div style="font-size:16px;line-height:1.55">${opts.bodyHtml}</div>
          <p style="margin:1.5rem 0">
            <a href="${ctaUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-family:Helvetica,Arial,sans-serif;font-size:15px">${ctaLabel}</a>
          </p>
          <p style="margin:1.5rem 0 0;font-size:14px;color:#555">— TapStamp</p>
          <p style="margin:1rem 0 0;font-size:12px;color:#888;font-family:Helvetica,Arial,sans-serif">Questions? Reply to this email · support@tapstamp.co</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function buyerHasLoyaltySignup(email: string): Promise<boolean> {
  const normalized = normalizeBuyerEmail(email);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from('businesses')
    .select('id, order_status')
    .eq('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('nurture: loyalty signup lookup failed', error.message);
    return false;
  }

  // Completed loyalty /order (paid) — pending_payment alone does not suppress.
  return data?.order_status === 'paid';
}

/** Suppress pending Day 2/7 (and unsent Day 0) after loyalty signup on same email. */
export async function suppressHardwareNurtureForEmail(
  email: string | null | undefined,
): Promise<number> {
  const normalized = normalizeBuyerEmail(email);
  if (!normalized) return 0;

  const { data, error } = await supabase
    .from('hardware_nurture_emails')
    .update({
      status: 'suppressed',
      error_detail: 'loyalty_signup',
      sent_at: new Date().toISOString(),
    })
    .eq('buyer_email', normalized)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error('nurture: suppress failed', error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function enqueueHardwareNurtureSequence(
  buyer: NurtureBuyer,
): Promise<{ enqueued: number; skipped: boolean; reason?: string }> {
  if (!isNurtureEmailEnabled()) {
    console.log('nurture: skipped enqueue (NFC_LOYALTY_NURTURE_ENABLED off)');
    return { enqueued: 0, skipped: true, reason: 'disabled' };
  }

  const email = normalizeBuyerEmail(buyer.email);
  if (!email) {
    return { enqueued: 0, skipped: true, reason: 'no_email' };
  }

  const sessionId = buyer.stripeCheckoutSessionId?.trim();
  if (!sessionId) {
    return { enqueued: 0, skipped: true, reason: 'no_session' };
  }

  const now = Date.now();
  const rows = ([0, 2, 7] as NurtureDay[]).map((day) => ({
    stripe_checkout_session_id: sessionId,
    buyer_email: email,
    business_name: buyer.businessName?.trim() || null,
    nfc_sku: buyer.nfcSku?.trim().slice(0, 80) || null,
    email_day: day,
    send_at: new Date(now + DAY_OFFSET_MS[day]).toISOString(),
    status: 'pending',
  }));

  const { error } = await supabase
    .from('hardware_nurture_emails')
    .upsert(rows, {
      onConflict: 'stripe_checkout_session_id,email_day',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('nurture: enqueue failed', error.message);
    return { enqueued: 0, skipped: true, reason: 'db_error' };
  }

  return { enqueued: rows.length, skipped: false };
}

async function markRow(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('hardware_nurture_emails')
    .update(patch)
    .eq('id', id);
  if (error) console.error('nurture: row update failed', error.message);
}

export async function sendNurtureRow(row: {
  id: string;
  buyer_email: string;
  business_name?: string | null;
  nfc_sku?: string | null;
  email_day: number;
  stripe_checkout_session_id: string;
}): Promise<'sent' | 'skipped' | 'failed' | 'suppressed'> {
  const day = row.email_day as NurtureDay;
  if (day !== 0 && day !== 2 && day !== 7) {
    await markRow(row.id, {
      status: 'failed',
      error_detail: 'invalid_day',
    });
    return 'failed';
  }

  if (!isNurtureEmailEnabled()) {
    await markRow(row.id, {
      status: 'skipped',
      error_detail: 'disabled',
      sent_at: new Date().toISOString(),
    });
    return 'skipped';
  }

  if (day !== 0) {
    const converted = await buyerHasLoyaltySignup(row.buyer_email);
    if (converted) {
      await markRow(row.id, {
        status: 'suppressed',
        error_detail: 'loyalty_signup',
        sent_at: new Date().toISOString(),
      });
      // Also suppress siblings for this buyer
      await suppressHardwareNurtureForEmail(row.buyer_email);
      return 'suppressed';
    }
  }

  const rendered = renderNurtureEmail(day, {
    email: row.buyer_email,
    businessName: row.business_name,
    nfcSku: row.nfc_sku,
  });

  const result = await sendTransactionalEmail({
    to: row.buyer_email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: `nurture:${row.stripe_checkout_session_id}:day${day}`,
    tags: [
      { name: 'sequence', value: 'offer_a_nfc_loyalty' },
      { name: 'email_day', value: String(day) },
    ],
  });

  if (!result.ok) {
    console.error('nurture: send failed', `day=${day}`, result.error);
    await markRow(row.id, {
      status: 'failed',
      error_detail: (result.error ?? 'send_failed').slice(0, 200),
    });
    return 'failed';
  }

  await markRow(row.id, {
    status: 'sent',
    provider_message_id: result.messageId ?? null,
    sent_at: new Date().toISOString(),
    error_detail: null,
  });
  console.log('nurture: sent', `day=${day}`, `session=${row.stripe_checkout_session_id.slice(0, 12)}`);
  return 'sent';
}

/** Enqueue + attempt Day 0 immediately after hardware_shop paid. */
export async function onHardwareShopPaid(params: {
  sessionId: string;
  email?: string | null;
  businessName?: string | null;
  nfcSku?: string | null;
}): Promise<void> {
  const enqueue = await enqueueHardwareNurtureSequence({
    email: params.email ?? '',
    businessName: params.businessName,
    nfcSku: params.nfcSku,
    stripeCheckoutSessionId: params.sessionId,
  });
  if (enqueue.skipped) return;

  const { data: day0, error } = await supabase
    .from('hardware_nurture_emails')
    .select(
      'id, buyer_email, business_name, nfc_sku, email_day, stripe_checkout_session_id, status',
    )
    .eq('stripe_checkout_session_id', params.sessionId)
    .eq('email_day', 0)
    .maybeSingle();

  if (error || !day0) {
    if (error) console.error('nurture: day0 load failed', error.message);
    return;
  }
  if (day0.status !== 'pending') return;

  await sendNurtureRow(day0);
}

export async function processDueNurtureEmails(
  limit = 50,
): Promise<{ processed: number; sent: number; skipped: number; failed: number; suppressed: number }> {
  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0, suppressed: 0 };
  if (!isNurtureEmailEnabled()) {
    return stats;
  }

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('hardware_nurture_emails')
    .select(
      'id, buyer_email, business_name, nfc_sku, email_day, stripe_checkout_session_id',
    )
    .eq('status', 'pending')
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('nurture: due query failed', error.message);
    return stats;
  }

  for (const row of rows ?? []) {
    stats.processed += 1;
    const outcome = await sendNurtureRow(row);
    stats[outcome] += 1;
  }

  return stats;
}
