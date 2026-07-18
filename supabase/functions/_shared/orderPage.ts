import { PLANS, parsePlanId, type PlanId } from './plans.ts';

const BG = '#FAF8F5';
const TEXT = '#1A1814';
const MUTED = '#8A8070';
const ACCENT = '#C9A96E';
const ACCENT_DARK = '#A68B4B';

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="${BG}">
  <title>Order TapStamp</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:${BG};color:${TEXT};min-height:100dvh}
    a{color:${ACCENT_DARK}}
    .wrap{max-width:560px;margin:0 auto;padding:2.5rem 1.5rem 3rem}
    .eyebrow{font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};margin-bottom:1rem}
    h1{font-size:2rem;font-weight:600;letter-spacing:-0.03em;line-height:1.15;margin-bottom:0.75rem}
    .lead{color:${MUTED};font-size:1rem;line-height:1.6;margin-bottom:1.5rem}
    label{display:block;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin-bottom:0.4rem}
    input,select{width:100%;background:#fff;border:1px solid #E8E4DD;border-radius:12px;padding:0.85rem 1rem;font-size:1rem;margin-bottom:1rem}
    input:focus,select:focus{outline:2px solid rgba(201,169,110,0.35);border-color:${ACCENT}}
    .btn{display:block;width:100%;background:${ACCENT};color:#fff;border:none;border-radius:12px;padding:1rem 1.25rem;font-size:1rem;font-weight:600;cursor:pointer;margin-top:0.5rem}
    .btn:hover{background:${ACCENT_DARK}}
    .back{display:inline-block;margin-bottom:1.5rem;color:${MUTED};text-decoration:none;font-size:0.9rem}
    .card{background:#fff;border:1px solid #F0EBE4;border-radius:20px;padding:1.75rem;margin-top:1rem}
    .note{font-size:0.85rem;color:${MUTED};line-height:1.5;margin-top:1rem}
    .success-icon{font-size:2.5rem;margin-bottom:1rem}
    .error{color:#C45C4A;font-size:0.9rem;margin-bottom:1rem}
    .steps{margin-top:1.5rem;padding-left:1.1rem;color:${MUTED};font-size:0.92rem;line-height:1.7}
    .plans{display:grid;gap:0.75rem;margin-bottom:1.25rem}
    .plan{border:1px solid #E8E4DD;border-radius:14px;padding:1rem;cursor:pointer;display:block}
    .plan input{display:none}
    .plan:has(input:checked){border-color:${ACCENT};background:rgba(201,169,110,0.08)}
    .plan-title{font-weight:600;margin-bottom:0.25rem}
    .plan-price{font-size:0.9rem;color:${MUTED}}
    .step-label{font-size:0.75rem;color:${ACCENT_DARK};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem}
    .price-box{background:#FAF8F5;border-radius:12px;padding:1rem;margin-bottom:1rem}
    .price-row{display:flex;justify-content:space-between;font-size:0.95rem;margin-bottom:0.35rem}
    .price-total{font-weight:600;border-top:1px solid #E8E4DD;padding-top:0.5rem;margin-top:0.5rem}
  </style>
</head>
<body>
  <div class="wrap">${content}</div>
  <script>
    document.querySelectorAll('.plan').forEach(function(el) {
      el.addEventListener('click', function() {
        var input = el.querySelector('input');
        if (input) { input.checked = true; updateSummary(); }
      });
    });
    function updateSummary() {
      var plan = document.querySelector('input[name=plan]:checked');
      if (!plan) return;
      var sub = document.getElementById('sub-line');
      var trial = document.getElementById('trial-line');
      var prices = { starter: null, pro: 25, multi: 59 };
      var p = prices[plan.value];
      if (sub) {
        sub.style.display = 'flex';
        sub.querySelector('span:last-child').textContent = p ? '£' + p + '/mo' : 'Free';
      }
      if (trial) trial.textContent = '14-day free trial starts when you go live — not at signup.';
    }
    updateSummary();
  </script>
</body>
</html>`;
}

function planOptions(selected: PlanId): string {
  return (['starter', 'pro', 'multi'] as PlanId[]).map((id) => {
    const p = PLANS[id];
    const monthly = p.monthlyGbp == null ? 'Free after trial' : `£${p.monthlyGbp}/mo after trial`;
    return `
      <label class="plan">
        <input type="radio" name="plan" value="${id}" ${id === selected ? 'checked' : ''}>
        <div class="plan-title">${p.name}</div>
        <div class="plan-price">Free stamp · ${monthly}</div>
        <div class="plan-price" style="margin-top:0.25rem">${p.tagline}</div>
      </label>`;
  }).join('');
}

export function orderFormPage(
  websiteUrl: string,
  selectedPlan: PlanId = 'starter',
  formAction?: string,
): string {
  const plan = PLANS[selectedPlan];
  const action = formAction ?? '';
  return shell(`
    <a href="${websiteUrl}" class="back">&larr; Back to TapStamp</a>
    <p class="eyebrow">Digital loyalty &middot; No app needed for customers</p>
    <h1>Order your TapStamp</h1>
    <p class="lead">Create your owner account. Your loyalty stamp is <strong>included free</strong>. Software billing starts after your 14-day trial at go-live.</p>

    <div class="card">
      <form method="POST"${action ? ` action="${action}"` : ''}>
        <p class="step-label">Choose your plan</p>
        <div class="plans">${planOptions(selectedPlan)}</div>

        <div class="price-box">
          <div class="price-row" id="sub-line" style="display:flex"><span>Software (after trial)</span><span>${plan.monthlyGbp == null ? 'Free' : `£${plan.monthlyGbp}/mo`}</span></div>
          <div class="price-total price-row"><span>Due today</span><span>£0</span></div>
          <p class="note" id="trial-line" style="margin-top:0.75rem;margin-bottom:0">14-day free trial starts when you go live — not at signup.</p>
        </div>

        <p class="step-label" style="margin-top:1rem">Your account</p>
        <label>Your name</label>
        <input name="owner_name" required placeholder="Alex Morgan">
        <label>Business name</label>
        <input name="business_name" required placeholder="Blue Bottle Coffee">
        <label>Email</label>
        <input name="email" type="email" required placeholder="owner@bluebottle.com" autocomplete="email">
        <label>Password</label>
        <input name="password" type="password" required minlength="8" placeholder="Min. 8 characters" autocomplete="new-password">

        <p class="step-label" style="margin-top:0.5rem">Shipping address</p>
        <label>Address</label>
        <input name="shipping_address_line1" required placeholder="123 High Street">
        <label>City</label>
        <input name="city" required placeholder="London">
        <label>Postcode</label>
        <input name="postcode" required placeholder="SW1A 1AA">
        <label>Phone (optional)</label>
        <input name="shipping_phone" type="tel" placeholder="07…">

        <button class="btn" type="submit">Continue to payment →</button>
      </form>
      <p class="note">Customers never need an app — they tap your stamp and add their card to Apple Wallet or Google Wallet.</p>
    </div>
  `);
}

export function orderSuccessPage(
  websiteUrl: string,
  email: string,
  plan: PlanId,
): string {
  const p = PLANS[plan];
  const afterTrial =
    p.monthlyGbp == null
      ? 'Your Starter plan stays free forever — up to 50 unique customers per calendar month after your trial (resets on the 1st).'
      : `After your trial, your ${p.name} plan is £${p.monthlyGbp}/month.`;

  return shell(`
    <div class="success-icon">✓</div>
    <p class="eyebrow">Order placed</p>
    <h1>You're all set</h1>
    <p class="lead">Payment received. We've created your owner account for <strong>${escapeHtml(email)}</strong>. Your ${p.name} loyalty stamp is on its way.</p>
    <div class="card">
      <p><strong>Save your login</strong></p>
      <p class="note" style="margin-top:0.5rem">Email: <strong>${escapeHtml(email)}</strong><br>Password: the one you just created</p>

      <p style="margin-top:1.25rem"><strong>What happens next</strong></p>
      <ol class="steps">
        <li>Your handcrafted stamp ships within 48 hours</li>
        <li>We'll email you when the owner app is ready to download</li>
        <li>Sign in with the email and password above</li>
        <li>When your stamp arrives, customise your card and tap it on the counter to go live</li>
        <li>Your 14-day free trial starts at go-live — ${afterTrial}</li>
      </ol>
      <p class="note" style="margin-top:1.25rem">Questions? <a href="mailto:hello@tapstamp.co">hello@tapstamp.co</a></p>
    </div>
    <p class="note" style="margin-top:1.5rem"><a href="${websiteUrl}">Return to tapstamp.co</a></p>
  `);
}

export function orderErrorPage(websiteUrl: string, message: string, plan = 'starter'): string {
  return shell(`
    <a href="${websiteUrl}/order?plan=${plan}" class="back">← Try again</a>
    <p class="eyebrow">Something went wrong</p>
    <h1>Could not place order</h1>
    <p class="error">${escapeHtml(message)}</p>
    <p class="lead">If you already ordered, open the TapStamp owner app and sign in with your email and password.</p>
    <a class="btn" href="${websiteUrl}/order?plan=${plan}" style="text-align:center;text-decoration:none">Back to order form</a>
  `);
}

export function orderPendingPage(websiteUrl: string, plan: PlanId = 'starter'): string {
  return shell(`
    <p class="eyebrow">Payment not completed</p>
    <h1>Your order is saved</h1>
    <p class="lead">You closed checkout before paying. Your account was created — sign in to the TapStamp owner app to complete payment, or submit the order form again with the same email.</p>
    <a class="btn" href="${websiteUrl}/order?plan=${plan}" style="text-align:center;text-decoration:none;margin-top:1rem">Return to order form</a>
    <p class="note" style="margin-top:1.5rem"><a href="${websiteUrl}">Back to tapstamp.co</a></p>
  `);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
