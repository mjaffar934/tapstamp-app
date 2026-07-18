-- Live dashboard: cafe schedule/campaign updates + ensure core tables are published
do $$ begin
  alter publication supabase_realtime add table public.cafes;
exception when duplicate_object then null;
         when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.passes;
exception when duplicate_object then null;
         when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.stamps;
exception when duplicate_object then null;
         when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.redemptions;
exception when duplicate_object then null;
         when undefined_object then null;
end $$;
