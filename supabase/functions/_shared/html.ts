// Premium mobile HTML for NFC tap flow — adapts to cafe brand colours (light + dark palettes).

export interface CafeBrand {
  id: string;
  name: string;
  reward: string;
  stamp_goal: number;
  logo_url?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  label_color?: string | null;
  welcome_message?: string | null;
  stamp_message?: string | null;
  reward_message?: string | null;
  collect_birthday?: boolean | null;
  minimum_spend?: number | null;
}

const BRAND_DARK = 'rgb(26,24,20)';
const BRAND_GOLD = 'rgb(201,169,110)';
const BRAND_CREAM = 'rgb(250,248,245)';
const BRAND_INK = 'rgb(26,24,20)';

export function getBg(cafe: CafeBrand) {
  return cafe.background_color || BRAND_DARK;
}
export function getFg(cafe: CafeBrand) {
  return cafe.foreground_color || BRAND_GOLD;
}

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isLightBackground(bg: string): boolean {
  const rgb = parseRgb(bg);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLogo(cafe: CafeBrand) {
  return cafe.logo_url
    ? `<img src="${cafe.logo_url}" alt="" class="logo">`
    : `<div class="logo-fallback">${escapeHtml(cafe.name.charAt(0).toUpperCase())}</div>`;
}

function getStamps(cafe: CafeBrand, count: number, filledColor?: string, emptyOpacity = 0.22) {
  const fg = filledColor ?? getFg(cafe);
  return `<div class="stamps">${Array.from({ length: cafe.stamp_goal }, (_, i) => {
    const filled = i < count;
    return `<span class="stamp${filled ? ' filled' : ''}" style="--stamp-fg:${fg};--stamp-empty:${emptyOpacity}"></span>`;
  }).join('')}</div>`;
}

function walletButton(label: string, href: string, isAndroid: boolean) {
  const icon = isAndroid
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';
  return `<a href="${href}" class="btn wallet-btn">${icon}<span>${escapeHtml(label)}</span></a>`;
}

function shellStyles(bg: string, fg: string, light: boolean): string {
  const cardBg = light ? '#FFFFFF' : 'rgba(255,255,255,0.06)';
  const cardBorder = light ? 'rgba(26,24,20,0.08)' : 'rgba(255,255,255,0.12)';
  const textMuted = light ? 'rgba(26,24,20,0.55)' : 'rgba(255,255,255,0.55)';
  const btnText = light ? BRAND_CREAM : bg;
  const inputBg = light ? '#FAF8F5' : 'rgba(255,255,255,0.07)';
  const inputBorder = light ? 'rgba(26,24,20,0.1)' : 'rgba(255,255,255,0.12)';

  return `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${bg};color:${fg};min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.75rem 1.25rem;text-align:center;-webkit-font-smoothing:antialiased}.wrap{width:100%;max-width:360px}.card{background:${cardBg};border:1px solid ${cardBorder};border-radius:22px;padding:1.75rem 1.5rem;box-shadow:${light ? '0 12px 40px rgba(26,24,20,0.06)' : '0 8px 32px rgba(0,0,0,0.2)'}}.logo{width:56px;height:56px;object-fit:contain;border-radius:12px;margin:0 auto 1rem;display:block}.logo-fallback{width:56px;height:56px;border-radius:14px;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:1.35rem;font-weight:600;background:${light ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.08)'};color:${fg}h1{font-size:1.35rem;font-weight:600;margin-bottom:0.35rem;letter-spacing:-0.02em;line-height:1.25}p{font-size:0.9rem;color:${textMuted};line-height:1.55;margin-bottom:0.85rem}.muted{font-size:0.8rem;color:${textMuted}}.stamps{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0.85rem 0 1rem}.stamp{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--stamp-fg);opacity:var(--stamp-empty);display:inline-block;position:relative}.stamp.filled{opacity:1;background:var(--stamp-fg)}.stamp.filled::after{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='%23${light ? '1A1814' : '1A1814'}' d='M1 5.2L4.2 8.4 11 1.6'/%3E%3C/svg%3E") center/10px no-repeat;filter:${light ? 'none' : 'invert(1) brightness(0.15)'}}.btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;background:${fg};color:${btnText};border:none;border-radius:14px;padding:0.95rem 1rem;font-size:0.95rem;font-weight:600;text-decoration:none;margin-top:0.35rem;cursor:pointer;transition:opacity 0.15s}.btn:active{opacity:0.88}.wallet-btn{min-height:52px}.reward-pill{display:inline-block;background:${light ? 'rgba(201,169,110,0.14)' : 'rgba(255,255,255,0.1)'};border:1px solid ${cardBorder};border-radius:12px;padding:0.75rem 1.25rem;font-size:1rem;font-weight:600;margin:0.5rem 0 0.85rem;color:${fg}}.celebrate{font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:${fg};opacity:0.7;margin-bottom:0.5rem}input,button{font-family:inherit}input[type=text],input[type=email],input[type=date]{width:100%;background:${inputBg};border:1px solid ${inputBorder};border-radius:12px;padding:0.85rem;color:${fg};font-size:0.95rem;outline:none;margin-bottom:0.75rem}input:focus{border-color:${fg};box-shadow:0 0 0 3px ${light ? 'rgba(201,169,110,0.25)' : 'rgba(255,255,255,0.12)'}}label{font-size:0.68rem;color:${textMuted};text-transform:uppercase;letter-spacing:0.12em;display:block;margin-bottom:5px;text-align:left}.link-btn{display:block;margin-top:0.65rem;color:${fg};opacity:0.45;font-size:0.85rem;text-decoration:none;padding:0.65rem}.powered{font-size:0.62rem;color:${textMuted};margin-top:1.25rem;letter-spacing:0.1em;text-transform:uppercase}`;
}

export function shell(cafe: CafeBrand, content: string) {
  const bg = getBg(cafe);
  const fg = getFg(cafe);
  const light = isLightBackground(bg);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="${bg}"><meta name="apple-mobile-web-app-capable" content="yes"><title>${escapeHtml(cafe.name)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${shellStyles(bg, fg, light)}</style></head><body><div class="wrap">${content}</div><div class="powered">TapStamp</div></body></html>`;
}

/** Standalone page when cafe brand is unknown (chip errors, global errors). */
export function brandShell(title: string, content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${BRAND_DARK}"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${shellStyles(BRAND_DARK, BRAND_GOLD, false)}</style></head><body><div class="wrap"><div class="card">${content}</div><div class="powered">TapStamp</div></div></body></html>`;
}

export function chipNotActivatedPage() {
  return brandShell(
    'TapStamp',
    `<div class="logo-fallback" style="margin-bottom:1rem">T</div><h1>Stamp not linked yet</h1><p>This TapStamp hasn't been connected to a cafe. If you're the owner, finish setup in the TapStamp app.</p><p class="muted">Customers: ask staff — your loyalty stamp will be ready soon.</p>`,
  );
}

export function errorPage(message = 'Something went wrong. Please try tapping again.') {
  return brandShell('TapStamp', `<h1>Please try again</h1><p>${escapeHtml(message)}</p><p class="muted">Hold your phone on the stamp for a moment, then try again.</p>`);
}

export function stampErrorPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Couldn't add stamp</h1><p>Please try again in a moment. If this keeps happening, show this screen to a member of staff.</p></div>`);
}

export function redirectPage(cafe: CafeBrand, title: string, subtitle: string, redirectUrl: string) {
  const safeUrl = escapeHtml(redirectUrl);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${safeUrl}"><meta name="theme-color" content="${getBg(cafe)}"><title>${escapeHtml(title)}</title><style>${shellStyles(getBg(cafe), getFg(cafe), isLightBackground(getBg(cafe)))}</style></head><body><div class="wrap"><div class="card">${getLogo(cafe)}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><p class="muted">Opening Wallet…</p><a href="${safeUrl}" class="btn wallet-btn" style="margin-top:1rem">Continue</a></div><div class="powered">TapStamp</div></div></body></html>`;
}

export function suspendedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>This loyalty programme is temporarily unavailable. Please check back soon.</p></div>`);
}

export function capacityReachedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>We're at capacity for new loyalty cards this month. If you're a regular, ask staff to stamp your existing card.</p><p class="muted">New sign-ups reopen next month.</p></div>`);
}

export function alreadyStampedPage(cafe: CafeBrand, stampCount: number, hoursLeft: number) {
  const remaining = cafe.stamp_goal - stampCount;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Already stamped</h1><p>Come back in <strong style="color:inherit;opacity:0.95">${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}</strong> for your next stamp.</p>${getStamps(cafe, stampCount)}<p class="muted">${stampCount}/${cafe.stamp_goal} stamps · ${remaining} more until ${escapeHtml(cafe.reward)}</p></div>`);
}

export function welcomePage(
  cafe: CafeBrand,
  serial: string,
  count: number,
  passUrl: string,
  isAndroid: boolean,
) {
  const remaining = cafe.stamp_goal - count;
  const btnLabel = isAndroid ? 'Add to Google Wallet' : 'Add to Apple Wallet';
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>${escapeHtml(cafe.welcome_message || 'Welcome — add your loyalty card to collect stamps.')}</p>${getStamps(cafe, count)}<p class="muted">${remaining} more stamp${remaining !== 1 ? 's' : ''} until <strong style="color:inherit;opacity:0.9">${escapeHtml(cafe.reward)}</strong></p>${walletButton(btnLabel, passUrl, isAndroid)}<p class="muted" style="margin-top:0.75rem;font-size:0.75rem">Tap the button, then confirm Add in the prompt</p></div>`);
}

export function stampedPage(cafe: CafeBrand, count: number, isRedeemed: boolean) {
  if (isRedeemed) {
    return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="celebrate">Reward ready</p><h1>${escapeHtml(cafe.reward_message || 'Your reward is ready')}</h1><p>${escapeHtml(cafe.name)}</p><div class="reward-pill">${escapeHtml(cafe.reward)}</div><p class="muted">Show this screen at the counter to claim your reward</p></div>`);
  }
  const remaining = cafe.stamp_goal - count;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.stamp_message || 'Stamp added')}</h1><p>${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}<p class="muted">${remaining} more stamp${remaining !== 1 ? 's' : ''} until <strong style="color:inherit;opacity:0.9">${escapeHtml(cafe.reward)}</strong></p></div>`);
}

export function customerForm(cafe: CafeBrand, serial: string, saveUrl: string) {
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">${escapeHtml(cafe.name)}</h1><p style="text-align:center;margin-bottom:1.25rem">Join our loyalty programme and earn your way to ${escapeHtml(cafe.reward)}</p><form action="${saveUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><input type="hidden" name="cafe_id" value="${cafe.id}"><label>Your name</label><input type="text" name="customer_name" placeholder="First name" autocomplete="given-name"><label>Email</label><input type="email" name="customer_email" placeholder="you@email.com" autocomplete="email">${cafe.collect_birthday ? '<label>Birthday</label><input type="date" name="birthday">' : ''}<button type="submit" class="btn" style="border:none">Join &amp; add to Wallet</button></form><form action="${saveUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><input type="hidden" name="cafe_id" value="${cafe.id}"><input type="hidden" name="skip" value="1"><button type="submit" class="link-btn" style="width:100%;background:transparent;border:none;cursor:pointer">Skip for now</button></form></div>`);
}

function formatPounds(amount: number): string {
  return `£${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function minimumSpendConfirmPage(cafe: CafeBrand, tapUrl: string, amount: number) {
  const confirmUrl = tapUrl.includes('?') ? `${tapUrl}&confirmed=1` : `${tapUrl}?confirmed=1`;
  const formatted = formatPounds(amount);
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Minimum spend</h1><p>To collect a stamp today, your purchase must be at least:</p><div class="reward-pill">${formatted}</div><p class="muted">Stamps are for in-store purchases only</p><a href="${confirmUrl}" class="btn">Yes, I spent ${formatted} or more</a><a href="${tapUrl}?dismissed=1" class="link-btn">Not today</a></div>`);
}

export function minimumSpendDismissedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>No stamp today</h1><p>No worries — come back when you've made a qualifying purchase. We'd love to see you again soon.</p><p class="muted">${escapeHtml(cafe.name)}</p></div>`);
}

export function returningVisitorPage(cafe: CafeBrand, tapUrl: string) {
  const restoreUrl = tapUrl.includes('?') ? `${tapUrl}&restore=1` : `${tapUrl}?restore=1`;
  const newUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>Have you visited before?</p><a href="${restoreUrl}" class="btn">Yes — restore my card</a><a href="${newUrl}" class="link-btn">No — get my stamp</a></div>`);
}

export function restoreCardFormPage(cafe: CafeBrand, tapUrl: string) {
  const backUrl = tapUrl.split('?')[0];
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">Restore your card</h1><p style="text-align:center;margin-bottom:1.25rem">Enter the email you used when you joined.</p><form method="POST" action="${tapUrl}"><label>Email</label><input type="email" name="customer_email" required placeholder="you@email.com" autocomplete="email"><button type="submit" class="btn" style="border:none">Restore my card</button></form><a href="${backUrl}" class="link-btn" style="text-align:center">Back</a></div>`);
}

export function restoreNotFoundPage(cafe: CafeBrand, tapUrl: string, email: string) {
  const newUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>No card found</h1><p>We couldn't find a loyalty card for <strong style="color:inherit;opacity:0.95">${escapeHtml(email)}</strong> at ${escapeHtml(cafe.name)}.</p><a href="${newUrl}" class="btn">Start fresh</a></div>`);
}
