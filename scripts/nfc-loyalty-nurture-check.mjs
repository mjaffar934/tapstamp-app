#!/usr/bin/env node
/**
 * MJ-26 unit checks for Offer A nurture templates + CTA contracts.
 * Pure assertions — no network, no secrets.
 */
import assert from 'node:assert/strict';

function normalizeBuyerEmail(email) {
  const trimmed = (email ?? '').trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

function displayBusinessName(name) {
  const trimmed = (name ?? '').trim();
  return trimmed || 'your shop';
}

function buildLoyaltyCtaUrl(params) {
  const base = (params.website ?? 'https://tapstamp.co').replace(/\/$/, '');
  const qs = new URLSearchParams();
  qs.set('from', 'nfc');
  qs.set('plan', 'pro');
  qs.set('email_day', String(params.emailDay));
  qs.set('nfc_channel', `email_day_${params.emailDay}`);
  const email = normalizeBuyerEmail(params.email);
  if (email) qs.set('email', email);
  const business = (params.businessName ?? '').trim();
  if (business) qs.set('business_name', business);
  const sku = (params.nfcSku ?? '').trim();
  if (sku) qs.set('nfc_sku', sku.slice(0, 80));
  return `${base}/order?${qs.toString()}`;
}

const SUBJECTS = {
  0: 'Your NFC is confirmed — add Wallet stamps next?',
  2: 'Reviews get the visit. Stamps get the return.',
  7: 'Still £0 to start stamp loyalty',
};

function assertNoFakeUrgency(text) {
  const banned = [
    /expires tonight/i,
    /offer ends/i,
    /only \d+ hours?/i,
    /act now/i,
    /last chance/i,
    /countdown/i,
  ];
  for (const re of banned) {
    assert.equal(re.test(text), false, `banned urgency matched ${re}`);
  }
}

// CTA shape
const cta0 = buildLoyaltyCtaUrl({
  email: 'Owner@Cafe.Example',
  businessName: 'Copper Cup',
  nfcSku: 'google_stand',
  emailDay: 0,
});
assert.ok(cta0.startsWith('https://tapstamp.co/order?'));
const u0 = new URL(cta0);
assert.equal(u0.searchParams.get('from'), 'nfc');
assert.equal(u0.searchParams.get('plan'), 'pro');
assert.equal(u0.searchParams.get('email_day'), '0');
assert.equal(u0.searchParams.get('nfc_channel'), 'email_day_0');
assert.equal(u0.searchParams.get('email'), 'owner@cafe.example');
assert.equal(u0.searchParams.get('business_name'), 'Copper Cup');
assert.equal(u0.searchParams.get('nfc_sku'), 'google_stand');

const ctaSparse = buildLoyaltyCtaUrl({ email: 'bad', emailDay: 2 });
const uSparse = new URL(ctaSparse);
assert.equal(uSparse.searchParams.get('email'), null);
assert.equal(uSparse.searchParams.get('email_day'), '2');
assert.equal(uSparse.searchParams.get('nfc_channel'), 'email_day_2');

assert.equal(displayBusinessName(''), 'your shop');
assert.equal(displayBusinessName('  Bean  '), 'Bean');
assert.equal(normalizeBuyerEmail('  A@B.C '), 'a@b.c');

for (const day of [0, 2, 7]) {
  assert.ok(SUBJECTS[day]);
  assertNoFakeUrgency(SUBJECTS[day]);
}

// Honest pricing anchors present in Day-7 subject / preview contract
assert.match(SUBJECTS[7], /£0/);
assert.doesNotMatch(SUBJECTS[7], /Sunday|tonight|hours left/i);

console.log('nfc-loyalty-nurture-check: ok');
