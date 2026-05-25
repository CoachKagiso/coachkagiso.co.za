create or replace function public.set_dashboard_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

select pg_notify('pgrst', 'reload schema');
