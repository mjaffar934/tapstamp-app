-- Lockable onboarding quiz for pass design personalisation.
-- Answers are written once at onboarding; classic ↔ AI may still swap colours.
alter table public.cafes
  add column if not exists pass_design_quiz jsonb,
  add column if not exists pass_design_locked_at timestamptz,
  add column if not exists pass_design_mode text default 'classic',
  add column if not exists ai_background_color text,
  add column if not exists ai_foreground_color text,
  add column if not exists ai_label_color text;

alter table public.cafes
  drop constraint if exists cafes_pass_design_mode_check;

alter table public.cafes
  add constraint cafes_pass_design_mode_check
  check (pass_design_mode is null or pass_design_mode in ('classic', 'ai'));
