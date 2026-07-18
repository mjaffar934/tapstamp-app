-- Production redemptions table was created without created_at; dashboard queries need it.

alter table public.redemptions
  add column if not exists created_at timestamptz not null default now();

create index if not exists redemptions_cafe_id_created_at_idx
  on public.redemptions (cafe_id, created_at desc);
