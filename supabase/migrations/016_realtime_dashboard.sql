-- Enable realtime for dashboard live updates
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
