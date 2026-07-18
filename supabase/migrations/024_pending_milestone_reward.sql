-- Pause stamping at mid milestones until staff redeems that reward.
alter table public.passes
  add column if not exists pending_milestone_reward text;
