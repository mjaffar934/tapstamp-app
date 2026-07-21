// Premium customer tap pages — one TapStamp template; cafe name + logo only.

import { TAPSTAMP_BG, TAPSTAMP_FG, TAPSTAMP_LABEL, TAPSTAMP_MUTED } from './brand.ts';
import { functionsUrl } from './client.ts';
import { isCampaignVisible, campaignPhase, formatCampaignSchedule, formatCampaignEndsAt, endOfTodayInTimeZone } from './campaign.ts';
import { formatRewardDisplay, untilMilestonesLine, milestoneAtCount, stripSegmentProgress, type RewardTierLike } from './walletDisplay.ts';

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
  collect_name_only?: boolean | null;
  minimum_spend?: number | null;
  active_campaign_message?: string | null;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
  double_stamp_hours?: Array<{ day: number; start: string; end: string }> | null;
  reward_tiers?: RewardTierLike[] | null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLogo(cafe: CafeBrand) {
  if (cafe.logo_url) {
    return `<img src="${cafe.logo_url}" alt="${escapeHtml(cafe.name)}" class="logo">`;
  }
  return '';
}

function getStamps(cafe: CafeBrand, count: number, totalOverride?: number) {
  const total = Math.max(1, totalOverride ?? cafe.stamp_goal);
  const filled = Math.max(0, Math.min(count, total));
  return `<div class="stamps">${Array.from({ length: total }, (_, i) => {
    const isFilled = i < filled;
    return `<span class="stamp${isFilled ? ' filled' : ''}"></span>`;
  }).join('')}</div>`;
}

function rewardText(reward: string): string {
  return escapeHtml(formatRewardDisplay(reward));
}

function progressRewardLine(cafe: CafeBrand, count: number): string {
  const line = untilMilestonesLine(
    count,
    cafe.stamp_goal,
    cafe.reward,
    cafe.reward_tiers,
  );
  // Highlight numbers + reward names for levels copy like "4 until Free pastry · 9 until …"
  const safe = escapeHtml(line).replace(
    /(\d+)\s+until\s+([^·<]+)/g,
    '<strong>$1</strong> until <strong>$2</strong>',
  );
  return `<p class="muted reward-line">${safe}</p>`;
}

function earnRewardPhrase(reward: string): string {
  const r = formatRewardDisplay(reward);
  if (!r) return 'Collect stamps with every visit';
  if (/^free\b/i.test(r)) return `Earn a ${r}`;
  if (/^(a|an)\s/i.test(r)) return `Earn ${r}`;
  const article = /^[aeiou]/i.test(r) ? 'an' : 'a';
  return `Earn ${article} ${r}`;
}

type DoubleStampWindow = { day: number; start: string; end: string };

function hasSaturdayDoubleStamp(hours: DoubleStampWindow[] | null | undefined): boolean {
  return (hours ?? []).some((w) => w.day === 6);
}

function nextSaturdayInTimeZone(timeZone = 'Europe/London'): Date {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = dayMap[weekday.slice(0, 3)] ?? now.getDay();
  const daysUntilSaturday = (6 - today + 7) % 7;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? now.getFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);

  const target = new Date(Date.UTC(year, month - 1, day + daysUntilSaturday, 9, 0, 0));
  return target;
}

function formatCalendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function calendarReminderUrl(title: string, details: string, start: Date, end: Date, cafeName: string): string {
  const dates = `${formatCalendarStamp(start)}/${formatCalendarStamp(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details: `${details}\n\n${cafeName}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function buildIcsEvent(title: string, start: Date, end: Date, details: string, cafeName: string): string {
  const uid = `${Date.now()}@tapstamp.co`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TapStamp//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${details.replace(/\n/g, '\\n')} — ${cafeName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function calendarReminderLinks(
  cafe: CafeBrand,
  title: string,
  details: string,
  start: Date,
  end: Date,
): string {
  const googleUrl = escapeHtml(calendarReminderUrl(title, details, start, end, cafe.name));
  const ics = buildIcsEvent(title, start, end, details, cafe.name);
  const icsUrl = escapeHtml(`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`);
  return `<div class="reminder-btns"><a href="${icsUrl}" class="btn btn-secondary promo-reminder" download="tapstamp-event.ics">Apple Calendar</a><a href="${googleUrl}" class="btn btn-secondary promo-reminder" target="_blank" rel="noopener">Google Calendar</a></div>`;
}

function campaignScheduleLabel(cafe: CafeBrand): string {
  const full = formatCampaignSchedule(cafe.campaign_starts_at, cafe.campaign_ends_at);
  if (full) return full;
  const endsOnly = formatCampaignEndsAt(cafe.campaign_ends_at);
  if (endsOnly) return endsOnly;
  if (isCampaignVisible(cafe)) return 'Finishes at end of today';
  return '';
}

function promoSection(cafe: CafeBrand): string {
  const campaign = isCampaignVisible(cafe) ? cafe.active_campaign_message?.trim() ?? '' : '';
  const doubleSaturday = hasSaturdayDoubleStamp(cafe.double_stamp_hours);
  if (!campaign && !doubleSaturday) return '';

  const phase = campaign ? campaignPhase(cafe) : null;
  const eyebrow = phase === 'live' ? 'On now' : 'Upcoming';
  const scheduleWhen = campaign ? campaignScheduleLabel(cafe) : null;
  const lines: string[] = ['<div class="promo-card">', `<p class="eyebrow">${eyebrow}</p>`];
  if (campaign) {
    lines.push(`<p class="promo-text">${escapeHtml(campaign)}</p>`);
    if (scheduleWhen) {
      lines.push(`<p class="promo-schedule">${escapeHtml(scheduleWhen)}</p>`);
    }
  }
  if (doubleSaturday) {
    lines.push('<p class="promo-text">Double stamps this Saturday</p>');
  }

  const hasCampaignWindow = Boolean(campaign && isCampaignVisible(cafe));
  if (hasCampaignWindow || doubleSaturday) {
    const start = cafe.campaign_starts_at
      ? new Date(cafe.campaign_starts_at)
      : endOfTodayInTimeZone();
    const end = cafe.campaign_ends_at
      ? new Date(cafe.campaign_ends_at)
      : endOfTodayInTimeZone();
    const reminderTitle = campaign
      ? `${campaign} — ${cafe.name}`
      : `Double stamps at ${cafe.name}`;
    const reminderDetails = [
      campaign || 'Collect double loyalty stamps.',
      scheduleWhen ? `When: ${scheduleWhen}` : '',
      'Tap your stamp on the day to collect rewards.',
    ].filter(Boolean).join('\n');
    lines.push(calendarReminderLinks(cafe, reminderTitle, reminderDetails, start, end));
  }

  lines.push('</div>');
  return lines.join('');
}

function walletButtons(
  applePassUrl: string,
  googlePassUrl: string | null,
  opts?: { preferGoogle?: boolean },
): string {
  const appleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c-.02-2.3 1.88-3.41 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.79-1.41-.14-2.76.83-3.48.83-.73 0-1.84-.81-3.03-.79-1.56.02-3 1.01-3.8 2.56-1.62 2.81-.41 6.97 1.16 9.25.77 1.12 1.69 2.38 2.9 2.34 1.17-.05 1.61-.75 3.02-.75 1.41 0 1.81.75 3.05.73 1.26-.02 2.06-1.14 2.82-2.27.89-1.3 1.26-2.56 1.28-2.62-.03-.01-2.46-.94-2.48-3.73zM14.86 4.77c.64-.78 1.07-1.85.95-2.93-.92.04-2.04.61-2.7 1.39-.6.69-1.12 1.8-.98 2.86 1.04.08 2.1-.53 2.73-1.32z"/></svg>';
  const googleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  const apple = `<a href="${applePassUrl}" class="wallet-btn wallet-apple wallet-add-btn">${appleIcon}<span>Add to Apple Wallet</span></a>`;
  const google = googlePassUrl
    ? `<a href="${googlePassUrl}" class="wallet-btn wallet-google wallet-add-btn">${googleIcon}<span>Add to Google Wallet</span></a>`
    : '';
  // Android: Google first (and only if available). Apple .pkpass is useless there.
  if (opts?.preferGoogle) {
    return `<div class="wallet-add">${google || apple}</div>`;
  }
  return `<div class="wallet-add">${apple}${google}</div>`;
}

function lostWalletCta(serial?: string): string {
  if (!serial) return '';
  return `<a href="?lost=1&p=${encodeURIComponent(serial)}" class="link-btn">Lost your digital wallet?</a>`;
}

function walletDoneLink(thanksUrl: string) {
  return `<a href="${thanksUrl}" class="link-btn wallet-add-btn">I&apos;ve added my card</a>`;
}

function walletBootstrapScript(cafeId: string, serial: string) {
  const safeId = escapeHtml(cafeId);
  const safeSerial = escapeHtml(serial);
  return `<script>(function(){try{var id="${safeId}",s="${safeSerial}";localStorage.setItem("tapstamp_"+id,s);document.cookie="pass_"+id+"="+s+";path=/;max-age=31536000;SameSite=Lax;Secure"}catch(e){}})();</script>`;
}

function markWalletAddedScript(cafeId: string) {
  const safeId = escapeHtml(cafeId);
  return `<script>(function(){try{localStorage.setItem("tapstamp_wallet_added_${safeId}","1")}catch(e){}})();</script>`;
}

function walletSetupGuardScript(cafeId: string, serial: string) {
  const safeId = escapeHtml(cafeId);
  const safeSerial = escapeHtml(serial);
  return `<script>(function(){try{if(localStorage.getItem("tapstamp_wallet_added_${safeId}")){var u=new URL(location.href);u.searchParams.delete("setup");u.searchParams.set("p","${safeSerial}");location.replace(u.pathname+u.search)}}catch(e){}})();</script>`;
}

function walletReturnScript(thanksUrl: string, cafeId: string) {
  const safe = escapeHtml(thanksUrl);
  const safeId = escapeHtml(cafeId);
  return `<script>(function(){var t="${safe}",id="${safeId}",w=false;function go(){try{localStorage.setItem("tapstamp_wallet_added_"+id,"1");sessionStorage.removeItem("tapstamp_wallet_pending")}catch(e){}location.href=t}document.querySelectorAll('a[href*="/pass/"],a[href*="/google-wallet/"],a.wallet-google,a.wallet-apple').forEach(function(a){a.addEventListener("click",function(){w=true;try{localStorage.setItem("tapstamp_wallet_added_"+id,"1");sessionStorage.setItem("tapstamp_wallet_pending","1")}catch(e){}})});document.addEventListener("visibilitychange",function(){if(document.visibilityState!=="visible"||!w)return;try{if(sessionStorage.getItem("tapstamp_wallet_pending"))go()}catch(e){go()}});window.addEventListener("pageshow",function(e){if(!w)return;try{if(sessionStorage.getItem("tapstamp_wallet_pending"))go()}catch(err){go()}})})();</script>`;
}

function persistScript(cafeId: string) {
  const safeId = escapeHtml(cafeId);
  // Bare tap URL = Join landing — do not resurrect old cards from localStorage.
  // Pass-scoped pages (?p=, setup, etc.) keep cookie + storage in sync.
  return `<script>(function(){var id="${safeId}",k="tapstamp_"+id,q=location.search||"";if(!q||q==="?")return;if(q.includes("new=1")||q.includes("join=1"))return;if(q.includes("restore=1"))return;if(q.includes("stamped=1")||q.includes("reward=1")||q.includes("cooldown=1")||q.includes("restarted=1"))return;var keep=q.includes("thanks=1")||q.includes("setup=1")||q.includes("welcome=1");function sync(s){try{localStorage.setItem(k,s);document.cookie="pass_"+id+"="+s+";path=/;max-age=31536000;SameSite=Lax;Secure"}catch(e){}}var m=document.cookie.match(new RegExp("(?:^|;)\\\\s*pass_"+id+"=([^;]+)"));if(m){sync(m[1]);return}try{var s=localStorage.getItem(k);if(s)sync(s)}catch(e){}})();</script>`;
}

export function passPersistScripts(cafeId: string, serial: string, extra = ''): string {
  return walletBootstrapScript(cafeId, serial) + extra;
}

const STYLES = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${TAPSTAMP_BG};background-image:radial-gradient(ellipse 120% 80% at 50% -20%,rgba(201,169,110,0.12),transparent 55%);color:${TAPSTAMP_FG};min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.25rem;text-align:center;-webkit-font-smoothing:antialiased}.wrap{width:100%;max-width:380px}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.14);border-radius:24px;padding:2rem 1.75rem;box-shadow:0 24px 48px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04)}.logo{width:80px;height:80px;object-fit:contain;border-radius:18px;margin:0 auto 1.5rem;display:block;box-shadow:0 8px 24px rgba(0,0,0,0.25)}.logo-fallback{width:80px;height:80px;border-radius:20px;margin:0 auto 1.5rem;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:600;background:rgba(201,169,110,0.12);color:${TAPSTAMP_FG};border:1px solid rgba(201,169,110,0.25)}.logo-name{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;margin:0 auto 1.5rem;line-height:1.2;color:#fff;max-width:280px}.divider{width:40px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.5),transparent);margin:0 auto 1rem}h1{font-size:1.65rem;font-weight:600;margin-bottom:0.65rem;letter-spacing:-0.03em;line-height:1.15;color:#fff}.tagline{font-size:1rem;color:rgba(255,255,255,0.72);line-height:1.55;margin-bottom:1.25rem}p{font-size:0.92rem;color:${TAPSTAMP_MUTED};line-height:1.6;margin-bottom:1rem}.muted{font-size:0.8rem;color:${TAPSTAMP_MUTED}}.stamps{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:1.25rem 0 1rem}.stamp{width:30px;height:30px;border-radius:50%;border:1.5px solid ${TAPSTAMP_FG};opacity:0.2}.stamp.filled{opacity:1;background:${TAPSTAMP_FG};box-shadow:0 0 12px rgba(201,169,110,0.35)}.btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;background:${TAPSTAMP_FG};color:${TAPSTAMP_BG};border:none;border-radius:14px;padding:1rem 1.1rem;font-size:0.95rem;font-weight:600;text-decoration:none;margin-top:0.5rem;cursor:pointer;transition:transform 0.15s,opacity 0.15s}.btn:active{opacity:0.9;transform:scale(0.98)}.btn-secondary{background:transparent;color:${TAPSTAMP_FG};border:1px solid rgba(201,169,110,0.35)}.wallet-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;border-radius:10px;padding:0.85rem 1rem;font-size:0.9rem;font-weight:600;text-decoration:none;margin-top:0.5rem;cursor:pointer;transition:opacity 0.15s;letter-spacing:-0.01em}.wallet-btn:active{opacity:0.88}.wallet-apple{background:#000;color:#fff;border:1px solid rgba(255,255,255,0.12)}.wallet-google{background:#fff;color:#3c4043;border:1px solid #dadce0;box-shadow:0 1px 2px rgba(60,64,67,0.12)}.reward-pill{display:inline-block;background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.25);border-radius:14px;padding:0.85rem 1.35rem;font-size:1.05rem;font-weight:600;margin:0.75rem 0 1rem;color:#fff}.reward-line strong{color:#fff;font-weight:600}input,button{font-family:inherit}input[type=text],input[type=email],input[type=date]{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:0.9rem;color:#fff;font-size:0.95rem;outline:none;margin-bottom:0.85rem}input::placeholder{color:rgba(255,255,255,0.35)}input:focus{border-color:${TAPSTAMP_FG};box-shadow:0 0 0 3px rgba(201,169,110,0.15)}label{font-size:0.65rem;color:${TAPSTAMP_LABEL};text-transform:uppercase;letter-spacing:0.14em;display:block;margin-bottom:6px;text-align:left}.link-btn{display:block;margin-top:0.75rem;color:${TAPSTAMP_FG};opacity:0.75;font-size:0.85rem;text-decoration:none;padding:0.5rem}.eyebrow{font-size:0.65rem;color:${TAPSTAMP_LABEL};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:0.5rem}.promo-card{background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.22);border-radius:16px;padding:1rem 1.1rem;margin:1rem 0 0.25rem;text-align:left}.promo-text{font-size:0.92rem;color:rgba(255,255,255,0.88);line-height:1.45;margin-bottom:0.35rem}.promo-schedule{font-size:0.82rem;color:rgba(201,169,110,0.95);line-height:1.4;margin-bottom:0.5rem;font-weight:500}.promo-reminder{margin-top:0.5rem;font-size:0.85rem;padding:0.75rem}.reminder-btns{display:flex;flex-direction:column;gap:0.5rem;margin-top:0.75rem}.wallet-thanks{margin-top:0.5rem}.restore-list{display:flex;flex-direction:column;gap:0.85rem;margin-top:1rem;text-align:left}.restore-card{background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.18);border-radius:16px;padding:1rem 1.1rem}.restore-card .eyebrow{margin-bottom:0.35rem}.restore-meta{font-size:0.88rem;color:rgba(255,255,255,0.78);margin-bottom:0.65rem}.restore-meta strong{color:#fff}.powered{font-size:0.6rem;color:rgba(255,255,255,0.28);margin-top:1.5rem;letter-spacing:0.14em;text-transform:uppercase}`;

export function shell(cafe: CafeBrand, content: string, extraScript = '') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="${TAPSTAMP_BG}"><meta name="apple-mobile-web-app-capable" content="yes"><title>${escapeHtml(cafe.name)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${STYLES}</style></head><body><div class="wrap">${content}</div><div class="powered">TapStamp</div>${persistScript(cafe.id)}${extraScript}</body></html>`;
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
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p>This loyalty programme has reached its free limit of <strong>50 unique customers this month</strong>.</p><p class="muted">Ask staff — once billing is set up, TapStamp upgrades automatically and new customers can join again.</p></div>`);
}

export function alreadyStampedPage(
  cafe: CafeBrand,
  stampCount: number,
  serial?: string,
  pendingReward?: string | null,
) {
  const extra = serial ? passPersistScripts(cafe.id, serial) : '';
  const reward = pendingReward?.trim();
  if (reward) {
    return shell(
      cafe,
      `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward unlocked</p><h1>Your next visit&apos;s on us</h1><p>You&apos;ve earned a reward of <strong>${rewardText(reward)}</strong>. Show your Wallet pass at the counter to claim it.</p><div class="reward-pill">${rewardText(reward)}</div>${getStamps(cafe, stampCount)}<p class="muted" style="font-size:0.75rem;margin-top:0.75rem">Your Wallet pass updates automatically.</p>${lostWalletCta(serial)}</div>`,
      extra,
    );
  }
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">You&apos;re stamped</p><h1>See you soon</h1><p>You&apos;re all set for this visit — come back next time for your next stamp.</p>${getStamps(cafe, stampCount)}${progressRewardLine(cafe, stampCount)}<p class="muted" style="font-size:0.75rem;margin-top:0.75rem">Your Wallet pass updates automatically.</p>${lostWalletCta(serial)}</div>`,
    extra,
  );
}

export function joinLandingPage(cafe: CafeBrand, tapUrl: string) {
  const joinUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  const restoreUrl = tapUrl.includes('?') ? `${tapUrl}&restore=1` : `${tapUrl}?restore=1`;
  const tagline = earnRewardPhrase(cafe.reward);
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p class="tagline">${escapeHtml(tagline)}</p><p class="muted" style="margin-bottom:0.5rem">Add your loyalty card in seconds — no app download.</p>${promoSection(cafe)}<a href="${joinUrl}" class="btn">Join loyalty programme</a><a href="${restoreUrl}" class="btn btn-secondary">Replace my card</a></div>`,
  );
}

export function addToWalletPage(
  cafe: CafeBrand,
  count: number,
  applePassUrl: string,
  googlePassUrl: string | null,
  thanksUrl: string,
  serial: string,
  cafeId: string,
  preferGoogle = false,
  fromLostWallet = false,
) {
  const tagline = cafe.welcome_message?.trim() || 'Add your loyalty card to Wallet';
  const warn = fromLostWallet
    ? `<div class="promo-card" style="margin-bottom:1rem"><p class="promo-text">Check Apple Wallet or Google Wallet first. If this card is already there, don&apos;t add it again — it updates when you stamp.</p></div>`
    : '';
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<h1>${escapeHtml(cafe.name)}</h1><p class="tagline">${escapeHtml(tagline)}</p>${warn}${getStamps(cafe, count)}${progressRewardLine(cafe, count)}${walletButtons(applePassUrl, googlePassUrl, { preferGoogle })}${walletDoneLink(thanksUrl)}</div>`,
    walletSetupGuardScript(cafeId, serial) + walletBootstrapScript(cafeId, serial) + walletReturnScript(thanksUrl, cafeId),
  );
}

/** Intermediate page before re-adding a pass after phone wipe / lost Wallet. */
export function lostWalletPage(cafe: CafeBrand, serial: string, setupUrl: string) {
  const extra = passPersistScripts(cafe.id, serial);
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">Digital wallet</p><h1>Lost your card?</h1><p>Open <strong>Apple Wallet</strong> or <strong>Google Wallet</strong> and check whether ${escapeHtml(cafe.name)} is already there.</p><p class="muted">If you still have it, you don&apos;t need to add it again — stamps update automatically.</p><a href="${escapeHtml(setupUrl)}" class="btn">I checked — add my card</a><a href="?p=${encodeURIComponent(serial)}&welcome=1" class="link-btn">Go back</a></div>`,
    extra,
  );
}

export interface RestoreWalletCard {
  serial: string;
  cafeId: string;
  cafeName: string;
  stampCount: number;
  stampGoal: number;
  memberCode?: string | null;
  isCurrentCafe: boolean;
  appleUrl: string;
  googleUrl: string | null;
  useHereUrl?: string;
}

/** Lost phone / replace card — list every pass for this email with Add to Wallet. */
export function restoreCardsPage(
  cafe: CafeBrand,
  email: string,
  cards: RestoreWalletCard[],
  preferGoogle = false,
) {
  const rows = cards.map((card) => {
    const meta = [
      `<strong>${card.stampCount}</strong> of ${card.stampGoal} stamps`,
      card.memberCode ? `Code ${escapeHtml(card.memberCode)}` : null,
    ].filter(Boolean).join(' · ');
    const useHere = card.isCurrentCafe && card.useHereUrl
      ? `<a href="${escapeHtml(card.useHereUrl)}" class="link-btn" style="text-align:center;margin-top:0.35rem">Use this card at ${escapeHtml(cafe.name)}</a>`
      : '';
    return `<div class="restore-card"><p class="eyebrow">${escapeHtml(card.cafeName)}</p><p class="restore-meta">${meta}</p>${walletButtons(card.appleUrl, card.googleUrl, { preferGoogle })}${useHere}</div>`;
  }).join('');

  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">Cards found</p><h1>Add your cards to Wallet</h1><p>We found ${cards.length} card${cards.length === 1 ? '' : 's'} for <strong class="reward-line">${escapeHtml(email)}</strong>. Add each one below.</p><div class="restore-list">${rows}</div></div>`,
  );
}

export function welcomePage(cafe: CafeBrand, count: number, serial?: string) {
  const extra = serial ? passPersistScripts(cafe.id, serial) : '';
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>Welcome back</h1><p class="tagline">${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}${progressRewardLine(cafe, count)}<p class="muted" style="font-size:0.75rem">Tap your phone on the loyalty stamp at the counter to collect your next stamp.</p>${lostWalletCta(serial)}</div>`, extra);
}

export function thanksJoinedPage(cafe: CafeBrand, count: number, serial?: string, setupUrl?: string) {
  const custom = cafe.stamp_message?.trim();
  const heading = custom || 'Thanks for visiting!';
  const subtext = 'Your card is in Wallet.';
  const backLine = setupUrl
    ? `<p class="muted" style="font-size:0.8rem;margin-top:1rem">If you haven&apos;t added the card yet, <a href="${escapeHtml(setupUrl)}" style="color:${TAPSTAMP_FG}">go back</a> and tap Add to Wallet.</p>`
    : `<p class="muted" style="font-size:0.8rem;margin-top:1rem">If you haven&apos;t added the card yet, tap Back and choose Add to Wallet.</p>`;
  const extra = passPersistScripts(
    cafe.id,
    serial ?? '',
    markWalletAddedScript(cafe.id),
  );
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">You&apos;re in</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(subtext)}</p>${getStamps(cafe, count)}${progressRewardLine(cafe, count)}<p class="muted" style="font-size:0.75rem;margin-top:0.75rem">On your next visit, tap your phone on the loyalty stamp at the counter.</p>${backLine}${lostWalletCta(serial)}</div>`,
    serial ? extra : markWalletAddedScript(cafe.id),
  );
}

export function stampedPage(cafe: CafeBrand, count: number, _rewardJustUnlocked = false, serial?: string, rewardName?: string | null) {
  const extra = serial ? passPersistScripts(cafe.id, serial) : '';
  const reward = rewardName?.trim()
    || (_rewardJustUnlocked
      ? (milestoneAtCount(count, cafe.reward_tiers)?.reward ?? (count >= cafe.stamp_goal ? cafe.reward : null))
      : null);
  if (reward) {
    const segment = stripSegmentProgress(count, cafe.stamp_goal, cafe.reward_tiers, {
      complete: true,
      redeemed: true,
    });
    return shell(
      cafe,
      `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward unlocked</p><h1>Your next visit&apos;s on us</h1><p>You&apos;ve earned a reward of <strong>${rewardText(String(reward))}</strong>.</p><div class="reward-pill">Redeem now</div><p class="muted" style="margin-top:-0.35rem;margin-bottom:0.75rem">${rewardText(String(reward))}</p><p class="muted reward-line"><strong>${segment.filled}</strong> of ${segment.total}</p>${getStamps(cafe, segment.filled, segment.total)}<p class="muted" style="font-size:0.75rem;margin-top:0.75rem">Show your Wallet pass at the counter to claim it.</p>${lostWalletCta(serial)}</div>`,
      extra,
    );
  }
  return shell(cafe, `<div class="card">${getLogo(cafe)}<p class="eyebrow">Stamp added</p><h1>${escapeHtml(cafe.stamp_message || 'Thanks for visiting!')}</h1><p>${escapeHtml(cafe.name)}</p>${getStamps(cafe, count)}${progressRewardLine(cafe, count)}<p class="muted" style="font-size:0.75rem">Your Wallet pass updates automatically.</p>${lostWalletCta(serial)}</div>`, extra);
}

/** Mid-milestone or final reward ready — names the specific reward. */
export function redeemReadyPage(
  cafe: CafeBrand,
  serial?: string,
  rewardName?: string,
  stampCount?: number,
) {
  const reward = rewardName?.trim() || cafe.reward;
  const count = stampCount ?? cafe.stamp_goal;
  const segment = stripSegmentProgress(count, cafe.stamp_goal, cafe.reward_tiers, {
    complete: true,
    redeemed: true,
  });
  const keepGoing = Boolean(
    cafe.reward_tiers &&
      cafe.reward_tiers.length >= 2 &&
      milestoneStillCollecting(cafe, reward),
  );
  const keepLine = keepGoing
    ? `<p class="muted" style="font-size:0.8rem;margin-top:0.75rem">Keep collecting stamps after you claim — your card continues.</p>`
    : `<p class="muted" style="font-size:0.75rem;margin-top:0.75rem">Your Wallet pass updates automatically. Tap again on your next visit to start collecting stamps.</p>`;
  const extra = serial ? passPersistScripts(cafe.id, serial) : '';
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward unlocked</p><h1>Your next visit&apos;s on us</h1><p>You&apos;ve earned a reward of <strong>${rewardText(reward)}</strong>.</p><div class="reward-pill">Redeem now</div><p class="muted" style="margin-top:-0.35rem;margin-bottom:0.75rem">${rewardText(reward)}</p><p class="muted reward-line"><strong>${segment.filled}</strong> of ${segment.total}</p>${getStamps(cafe, segment.filled, segment.total)}<p class="muted"><strong class="reward-line">Show your Wallet pass</strong> at the counter to claim it. Staff will tap Redeem reward in the app.</p>${keepLine}${lostWalletCta(serial)}</div>`,
    extra,
  );
}

function milestoneStillCollecting(cafe: CafeBrand, rewardName: string): boolean {
  const sorted = [...(cafe.reward_tiers ?? [])].sort(
    (a, b) => Number(a.stamp_count) - Number(b.stamp_count),
  );
  if (sorted.length < 2) return false;
  const last = sorted[sorted.length - 1];
  return formatRewardDisplay(String(last.reward)).toLowerCase() !==
    formatRewardDisplay(rewardName).toLowerCase();
}

export function rewardRestartPage(cafe: CafeBrand, count: number, serial?: string) {
  const extra = serial ? passPersistScripts(cafe.id, serial) : '';
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">Well done</p><h1>You're collecting again</h1><p>If you haven&apos;t already, make sure to claim your <strong>${rewardText(cafe.reward)}</strong> at the counter.</p>${getStamps(cafe, count)}${progressRewardLine(cafe, count)}<p class="muted" style="font-size:0.75rem">Your Wallet pass updates automatically.</p>${lostWalletCta(serial)}</div>`,
    extra,
  );
}

export function rewardRedeemedPage(
  cafe: CafeBrand,
  count: number,
  memberCode?: string,
  continued = false,
  serial?: string,
) {
  const codeLine = memberCode
    ? `<p class="muted" style="font-size:0.8rem;margin-top:0.5rem">Your member code: <strong>${escapeHtml(memberCode)}</strong></p>`
    : '';
  if (continued) {
    return shell(
      cafe,
      `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward redeemed</p><h1>${escapeHtml(cafe.reward_message || 'Enjoy your reward!')}</h1><p>Your stamps carry on — you&apos;re still on <strong>${count}</strong>. Next tap adds stamp ${count + 1}.</p>${getStamps(cafe, count)}${progressRewardLine(cafe, count)}<p class="muted" style="font-size:0.75rem">Your Wallet pass is updated.</p>${codeLine}${lostWalletCta(serial)}</div>`,
    );
  }
  return shell(
    cafe,
    `<div class="card">${getLogo(cafe)}<p class="eyebrow">Reward redeemed</p><h1>${escapeHtml(cafe.reward_message || 'Enjoy your reward!')}</h1><p>Your card has been reset — start collecting again.</p>${getStamps(cafe, count)}<p class="muted reward-line"><strong>0</strong> of ${cafe.stamp_goal} stamps · ${rewardText(cafe.reward)}</p><p class="muted" style="font-size:0.75rem">Your Wallet pass is updated. Tap again on your next visit for your next stamp.</p>${codeLine}${lostWalletCta(serial)}</div>`,
  );
}

export function customerForm(cafe: CafeBrand, serial: string, _chipCode: string, tapUrl: string) {
  const nameOnly = cafe.collect_name_only === true;
  const emailFields = nameOnly
    ? ''
    : '<label>Email</label><input type="email" name="customer_email" placeholder="you@email.com" autocomplete="email">';
  const birthdayField = !nameOnly && cafe.collect_birthday
    ? '<label>Birthday</label><input type="date" name="birthday">'
    : '';
  const skipForm = nameOnly
    ? ''
    : `<form action="${tapUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><button type="submit" class="link-btn" style="width:100%;background:transparent;border:none;cursor:pointer">Skip for now</button></form>`;
  const subtitle = nameOnly
    ? 'Tell us your first name to personalise your card.'
    : escapeHtml(earnRewardPhrase(cafe.reward));
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">${escapeHtml(cafe.name)}</h1><p style="text-align:center;margin-bottom:1.25rem" class="tagline">${subtitle}</p><form action="${tapUrl}" method="POST"><input type="hidden" name="serial" value="${serial}"><label>Your name</label><input type="text" name="customer_name" placeholder="First name" autocomplete="given-name" required>${emailFields}${birthdayField}<button type="submit" class="btn" style="border:none">Continue</button></form>${skipForm}<a href="${tapUrl}?restore=1" class="link-btn" style="text-align:center">Replace an existing card</a></div>`);
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
  return shell(cafe, `<div class="card" style="text-align:left">${getLogo(cafe)}<h1 style="text-align:center">Replace your card</h1><p style="text-align:center;margin-bottom:1.25rem">Enter the email you used when you joined. We&apos;ll find every loyalty card on that email so you can add them to Wallet again.</p><form method="POST" action="${tapUrl}"><label>Email</label><input type="email" name="customer_email" required placeholder="you@email.com" autocomplete="email"><button type="submit" class="btn" style="border:none">Find my cards</button></form></div>`);
}

export function restoreNotFoundPage(cafe: CafeBrand, tapUrl: string, email: string) {
  const newUrl = tapUrl.includes('?') ? `${tapUrl}&new=1` : `${tapUrl}?new=1`;
  return shell(cafe, `<div class="card">${getLogo(cafe)}<h1>No card found</h1><p>No card for <strong class="reward-line">${escapeHtml(email)}</strong> at ${escapeHtml(cafe.name)}.</p><a href="${newUrl}" class="btn">Start fresh</a></div>`);
}
