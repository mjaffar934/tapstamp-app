alter table public.cafes
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postcode text;
