// Premium customer tap pages — one TapStamp template; cafe name + logo only.

import { TAPSTAMP_BG, TAPSTAMP_FG, TAPSTAMP_LABEL, TAPSTAMP_MUTED } from './brand.ts';
import { formatRewardDisplay } from './walletDisplay.ts';

export interface CafeBrand {
  id: string;
  name: string;
  reward: string;
  stamp_goal: number;
  logo_url?: string | null;
  welcome_message?: string | null;
  stamp_message?: string | null;
  reward_message?: string | null;
  collect_birthday?: boolean | null;
  minimum_spend?: number | null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLogo(cafe: CafeBrand) {
  if (cafe.logo_url) {
    return `<img src="${cafe.logo_url}" alt="" class="logo">`;
  }
  return `<div class="logo-name">${escapeHtml(cafe.name.trim() || 'Your business')}</div>`;
}

function getStamps(cafe: CafeBrand, count: number) {
  return `<div class="stamps">${Array.from({ length: cafe.stamp_goal }, (_, i) => {
    const filled = i < count;
    return `<span class="stamp${filled ? ' filled' : ''}"></span>`;
  }).join('')}</div>`;
}

function rewardText(reward: string): string {
  return escapeHtml(formatRewardDisplay(reward));
}

function earnRewardPhrase(reward: string): string {
  const r = formatRewardDisplay(reward);
  if (!r) return 'Collect stamps with every visit';
  if (/^free\b/i.test(r)) return `Earn a ${r}`;
  if (/^(a|an)\s/i.test(r)) return `Earn ${r}`;
  const article = /^[aeiou]/i.test(r) ? 'an' : 'a';
  return `Earn ${article} ${r}`;
}

function walletButtons(applePassUrl: string, googlePassUrl: string | null): string {
  const appleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c-.02-2.3 1.88-3.41 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.79-1.41-.14-2.76.83-3.48.83-.73 0-1.84-.81-3.03-.79-1.56.02-3 1.01-3.8 2.56-1.62 2.81-.41 6.97 1.16 9.25.77 1.12 1.69 2.38 2.9 2.34 1.17-.05 1.61-.75 3.02-.75 1.41 0 1.81.75 3.05.73 1.26-.02 2.06-1.14 2.82-2.27.89-1.3 1.26-2.56 1.28-2.62-.03-.01-2.46-.94-2.48-3.73zM14.86 4.77c.64-.78 1.07-1.85.95-2.93-.92.04-2.04.61-2.7 1.39-.6.69-1.12 1.8-.98 2.86 1.04.08 2.1-.53 2.73-1.32z"/></svg>';
  const googleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  const apple = `<a href="${applePassUrl}" class="wallet-btn wallet-apple">${appleIcon}<span>Add to Apple Wallet</span></a>`;
  const google = googlePassUrl
    ? `<a href="${googlePassUrl}" class="wallet-btn wallet-google">${googleIcon}<span>Add to Google Wallet</span></a>`
    : '';
  return apple + google;
}

function walletDoneLink(thanksUrl: string) {
  return `<a href="${thanksUrl}" class="link-btn">I&apos;ve added my card</a>`;
}

function persistScript(cafeId: string) {
  const safeId = escapeHtml(cafeId);
  return `<script>(function(){var id="${safeId}",k="tapstamp_"+id,m=document.cookie.match(new RegExp("(?:^|;)\\\\s*pass_"+id+"=([^;]+)"));if(m){try{localStorage.setItem(k,m[1])}catch(e){}return}try{var s=localStorage.getItem(k);if(s&&!location.search.includes("new=1")){document.cookie="pass_"+id+"="+s+";path=/;max-age=31536000;SameSite=Lax";if(!location.search.includes("p=")){var q=location.search?location.search+"&":"?";location.replace(location.pathname+q+"p="+encodeURIComponent(s));return}location.reload()}}catch(e){}})();</script>`;
}

const STYLES = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${TAPSTAMP_BG};background-image:radial-gradient(ellipse 120% 80% at 50% -20%,rgba(201,169,110,0.12),transparent 55%);color:${TAPSTAMP_FG};min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.25rem;text-align:center;-webkit-font-smoothing:antialiased}.wrap{width:100%;max-width:380px}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.14);border-radius:24px;padding:2rem 1.75rem;box-shadow:0 24px 48px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04)}.logo{width:80px;height:80px;object-fit:contain;border-radius:18px;margin:0 auto 1.5rem;display:block;box-shadow:0 8px 24px rgba(0,0,0,0.25)}.logo-fallback{width:80px;height:80px;border-radius:20px;margin:0 auto 1.5rem;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:600;background:rgba(201,169,110,0.12);color:${TAPSTAMP_FG};border:1px solid rgba(201,169,110,0.25)}.logo-name{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;margin:0 auto 1.5rem;line-height:1.2;color:#fff;max-width:280px}.divider{width:40px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.5),transparent);margin:0 auto 1rem}h1{font-size:1.65rem;font-weight:600;margin-bottom:0.65rem;letter-spacing:-0.03em;line-height:1.15;color:#fff}.tagline{font-size:1rem;color:rgba(255,255,255,0.72);line-height:1.55;margin-bottom:1.25rem}p{font-size:0.92rem;color:${TAPSTAMP_MUTED};line-height:1.6;margin-bottom:1rem}.muted{font-size:0.8rem;color:${TAPSTAMP_MUTED}}.stamps{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:1.25rem 0 1rem}.stamp{width:30px;height:30px;border-radius:50%;border:1.5px solid ${TAPSTAMP_FG};opacity:0.2}.stamp.filled{opacity:1;background:${TAPSTAMP_FG};box-shadow:0 0 12px rgba(201,169,110,0.35)}.btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;background:${TAPSTAMP_FG};color:${TAPSTAMP_BG};border:none;border-radius:14px;padding:1rem 1.1rem;font-size:0.95rem;font-weight:600;text-decoration:none;margin-top:0.5rem;cursor:pointer;transition:transform 0.15s,opacity 0.15s}.btn:active{opacity:0.9;transform:scale(0.98)}.btn-secondary{background:transparent;color:${TAPSTAMP_FG};border:1px solid rgba(201,169,110,0.35)}.wallet-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;border-radius:10px;padding:0.85rem 1rem;font-size:0.9rem;font-weight:600;text-decoration:none;margin-top:0.5rem;cursor:pointer;transition:opacity 0.15s;letter-spacing:-0.01em}.wallet-btn:active{opacity:0.88}.wallet-apple{background:#000;color:#fff;border:1px solid rgba(255,255,255,0.12)}.wallet-google{background:#fff;color:#3c4043;border:1px solid #dadce0;box-shadow:0 1px 2px rgba(60,64,67,0.12)}.reward-pill{display:inline-block;background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.25);border-radius:14px;padding:0.85rem 1.35rem;font-size:1.05rem;font-weight:600;margin:0.75rem 0 1rem;color:#fff}.reward-line strong{color:#fff;font-weight:600}input,button{font-family:inherit}input[type=text],input[type=email],input[type=date]{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:0.9rem;color:#fff;font-size:0.95rem;outline:none;margin-bottom:0.85rem}input::placeholder{color:rgba(255,255,255,0.35)}input:focus{border-color:${TAPSTAMP_FG};box-shadow:0 0 0 3px rgba(201,169,110,0.15)}label{font-size:0.65rem;color:${TAPSTAMP_LABEL};text-transform:uppercase;letter-spacing:0.14em;display:block;margin-bottom:6px;text-align:left}.link-btn{display:block;margin-top:0.75rem;color:${TAPSTAMP_FG};opacity:0.75;font-size:0.85rem;text-decoration:none;padding:0.5rem}.powered{font-size:0.6rem;color:rgba(255,255,255,0.28);margin-top:1.5rem;letter-spacing:0.14em;text-transform:uppercase}`;

export function shell(cafe: CafeBrand, content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="${TAPSTAMP_BG}"><meta name="apple-mobile-web-app-capable" content="yes"><title>${escapeHtml(cafe.name)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${STYLES}</style></head><body><div class="wrap">${content}</div><div class="powered">TapStamp</div>${persistScript(cafe.id)}</body></html>`;
}

export function brandShell(title: string, content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${TAPSTAMP_BG}"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${STYLES}</style></head><body><div class="wrap"><div class="card">${content}</div><div class="powered">TapStamp</div></div></body></html>`;
}

export function chipNotActivatedPage() {
  return brandShell('TapStamp', `<div class="logo-fallback" style="margin-bottom:1rem">T</div><h1>Stamp not linked yet</h1><p>This TapStamp hasn&apos;t been connected to a cafe yet.</p>`);
}

export function errorPage(message = 'Something went wrong. Please try tapping again.') {
  return brandShell('TapStamp', `<h1>Please try again</h1><p>${escapeHtml(message)}</p>`);
}

export function stampErrorPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Couldn&apos;t add stamp</h1><p>Please try again. If this keeps happening, show this screen to staff.</p></div>`);
}

export function redirectPage(cafe: CafeBrand, title: string, subtitle: string, redirectUrl: string) {
  const safeUrl = escapeHtml(redirectUrl);
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><p class="muted">Opening Wallet…</p><a href="${safeUrl}" class="btn wallet-btn" style="margin-top:1rem">Continue</a><meta http-equiv="refresh" content="0;url=${safeUrl}"></div>`);
}

export function suspendedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>This loyalty programme is temporarily unavailable.</p></div>`);
}

export function capacityReachedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>We&apos;re at capacity for new cards this month. Ask staff if you&apos;re a regular.</p></div>`);
}

export function alreadyStampedPage(cafe: CafeBrand, stampCount: number) {
  const remaining = cafe.stamp_goal - stampCount;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<div class="divider"></div><h1>Already stamped</h1><p>You&apos;ve already collected a stamp today. Come back on your next visit.</p>${getStamps(cafe, stampCount)}<p class="muted">${stampCount}/${cafe.stamp_goal} stamps · ${remaining} until ${rewardText(cafe.reward)}</p></div>`);
}

export function joinLandingPage(cafe: CafeBrand, tapUrl: string) {
  const joinUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  const restoreUrl = tapUrl.includes('?') ? `${tapUrl}&restore=1` : `${tapUrl}?restore=1`;
  const tagline = earnRewardPhrase(cafe.reward);
  return shell(cafe, `<div class="card">${getLogo(cafe)}<div class="divider"></div><h1>${escapeHtml(cafe.name)}</h1><p class="tagline">${escapeHtml(tagline)}</p><a href="${joinUrl}" class="btn">Join loyalty programme</a><a href="${restoreUrl}" class="btn btn-secondary">I already have a card</a></div>`);
}

export function welcomePage(
  cafe: CafeBrand,
  serial: string,
  count: number,
  applePassUrl: string,
  googlePassUrl: string | null,
  thanksUrl: string,
  hasWallet = false,
) {
  const remaining = cafe.stamp_goal - count;
  const tagline = cafe.welcome_message?.trim() || earnRewardPhrase(cafe.reward);
  if (hasWallet) {
    return shell(cafe, `<div class="card">${getLogo(cafe)}<div class="divider"></div><h1>Welcome back</h1><p class="tagline">${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}<p class="muted reward-line">${remaining} stamp${remaining !== 1 ? 's' : ''} until <strong>${rewardText(cafe.reward)}</strong></p><p class="muted" style="font-size:0.75rem">Tap again on your next visit to collect a stamp.</p></div>`);
  }
  return shell(cafe, `<div class="card">${getLogo(cafe)}<div class="divider"></div><h1>${escapeHtml(cafe.name)}</h1><p class="tagline">${escapeHtml(tagline)}</p>${getStamps(cafe, count)}<p class="muted reward-line">${remaining} stamp${remaining !== 1 ? 's' : ''} until <strong>${rewardText(cafe.reward)}</strong></p>${walletButtons(applePassUrl, googlePassUrl)}${walletDoneLink(thanksUrl)}</div>`);
}

export function thanksJoinedPage(cafe: CafeBrand, count: number) {
  const remaining = cafe.stamp_goal - count;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="eyebrow">You&apos;re in</p><h1>Thanks for joining</h1><p>Your card is in Wallet. Keep tapping to collect stamps.</p>${getStamps(cafe, count)}<p class="muted reward-line"><strong>${remaining}</strong> until ${rewardText(cafe.reward)}</p></div>`);
}

export function stampedPage(cafe: CafeBrand, count: number, rewardJustUnlocked = false) {
  if (rewardJustUnlocked) {
    return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="eyebrow">Card complete</p><h1>All stamps collected</h1><p>${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}<div class="reward-pill">${rewardText(cafe.reward)}</div><p class="muted">Your reward is unlocked. <strong class="reward-line">Tap again on your next visit</strong> to show staff at the counter.</p><p class="muted" style="font-size:0.75rem">Your Wallet pass will update automatically.</p></div>`);
  }
  const remaining = cafe.stamp_goal - count;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="eyebrow">Stamp added</p><h1>${escapeHtml(cafe.stamp_message || 'See you again soon')}</h1><p>${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}<p class="muted reward-line"><strong>${remaining}</strong> stamp${remaining !== 1 ? 's' : ''} until ${rewardText(cafe.reward)}</p><p class="muted" style="font-size:0.75rem">Your Wallet pass updates automatically.</p></div>`);
}

export function redeemReadyPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward ready</p><h1>${escapeHtml(cafe.reward_message || 'Time to claim your reward')}</h1><div class="reward-pill">${rewardText(cafe.reward)}</div>${getStamps(cafe, cafe.stamp_goal)}<p class="muted"><strong class="reward-line">Show this screen at the counter</strong> so staff can redeem your reward.</p></div>`);
}

export function customerForm(cafe: CafeBrand, serial: string, _chipCode: string, tapUrl: string) {
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">${escapeHtml(cafe.name)}</h1><p style="text-align:center;margin-bottom:1.25rem" class="tagline">${escapeHtml(earnRewardPhrase(cafe.reward))}</p><form action="${tapUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><label>Your name</label><input type="text" name="customer_name" placeholder="First name" autocomplete="given-name"><label>Email</label><input type="email" name="customer_email" placeholder="you@email.com" autocomplete="email">${cafe.collect_birthday ? '<label>Birthday</label><input type="date" name="birthday">' : ''}<button type="submit" class="btn" style="border:none">Continue</button></form><form action="${tapUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><button type="submit" class="link-btn" style="width:100%;background:transparent;border:none;cursor:pointer">Skip for now</button></form><a href="${tapUrl}?restore=1" class="link-btn" style="text-align:center">Restore an existing card</a></div>`);
}

function formatPounds(amount: number): string {
  return `£${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function minimumSpendConfirmPage(cafe: CafeBrand, tapUrl: string, amount: number) {
  const confirmUrl = tapUrl.includes('?') ? `${tapUrl}&confirmed=1` : `${tapUrl}?confirmed=1`;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Minimum spend</h1><p>Today&apos;s purchase must be at least:</p><div class="reward-pill">${formatPounds(amount)}</div><a href="${confirmUrl}" class="btn">Yes, I spent ${formatPounds(amount)}+</a><a href="${tapUrl}?dismissed=1" class="link-btn">Not today</a></div>`);
}

export function minimumSpendStaffPage(cafe: CafeBrand, amount: number) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Ask staff to stamp you</h1><p>Minimum spend of <strong>${formatPounds(amount)}</strong> applies. After you pay, staff will add your stamp from the counter.</p><p class="muted">Your wallet pass will update automatically.</p></div>`);
}

export function minimumSpendDismissedPage(cafe: CafeBrand) {
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>No stamp today</h1><p>Come back when you&apos;ve made a qualifying purchase.</p></div>`);
}

export function restoreCardFormPage(cafe: CafeBrand, tapUrl: string) {
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">Restore your card</h1><p style="text-align:center;margin-bottom:1.25rem">Enter the email you used when you joined.</p><form method="POST" action="${tapUrl}"><label>Email</label><input type="email" name="customer_email" required placeholder="you@email.com" autocomplete="email"><button type="submit" class="btn" style="border:none">Restore my card</button></form></div>`);
}

export function restoreNotFoundPage(cafe: CafeBrand, tapUrl: string, email: string) {
  const newUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>No card found</h1><p>No card for <strong class="reward-line">${escapeHtml(email)}</strong> at ${escapeHtml(cafe.name)}.</p><a href="${newUrl}" class="btn">Start fresh</a></div>`);
}
