-- Plans, order funnel, and subscription status

alter table public.cafes drop constraint if exists cafes_plan_check;

update public.cafes set plan = 'pro' where plan = 'paid';
update public.cafes set plan = 'starter' where plan is null or plan = 'trial';
update public.cafes set plan = 'starter' where plan not in ('starter', 'pro', 'multi');

alter table public.cafes
  add constraint cafes_plan_check
  check (plan in ('starter', 'pro', 'multi'));

alter table public.businesses
  add column if not exists plan_selected text
    check (plan_selected is null or plan_selected in ('starter', 'pro', 'multi')),
  add column if not exists order_status text not null default 'ordered'
    check (order_status in ('pending_payment', 'paid', 'shipped', 'delivered')),
  add column if not exists kit_received boolean not null default false,
  add column if not exists shipping_address_line1 text,
  add column if not exists shipping_phone text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled'));

alter table public.cafes
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled'));

-- Existing live accounts already have their kit
update public.businesses
set kit_received = true,
    order_status = 'delivered',
    plan_selected = coalesce(plan_selected, 'starter')
where onboarding_status = 'complete';

update public.cafes c
set plan = coalesce(b.plan_selected, 'starter')
from public.businesses b
where lower(b.email) = lower(c.email)
  and b.plan_selected is not null
  and c.plan in ('starter', 'pro', 'multi');
