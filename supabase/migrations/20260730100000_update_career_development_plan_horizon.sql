alter table public.client_strategy_plans
  drop constraint if exists client_strategy_plans_duration_check;

alter table public.client_strategy_plans
  add constraint client_strategy_plans_duration_check
  check (
    (service_slug = 'career-clarity' and duration_days in (14, 30))
    or (service_slug = 'glow-up-vip' and duration_days = 30)
  );

create or replace function public.create_client_strategy_plan(
  p_workspace_id uuid,
  p_generated_content jsonb,
  p_source_snapshot jsonb,
  p_generator_provider text,
  p_generator_model text,
  p_prompt_version text
)
returns public.client_strategy_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace public.client_strategy_workspaces%rowtype;
  v_version integer;
  v_plan public.client_strategy_plans%rowtype;
begin
  select *
  into v_workspace
  from public.client_strategy_workspaces
  where id = p_workspace_id
  for update;

  if not found then
    raise exception 'Strategy workspace not found';
  end if;

  update public.client_strategy_plans
  set status = 'superseded', approved_by = null, approved_at = null
  where workspace_id = p_workspace_id and status = 'draft';

  select coalesce(max(version), 0) + 1
  into v_version
  from public.client_strategy_plans
  where workspace_id = p_workspace_id;

  insert into public.client_strategy_plans (
    workspace_id,
    payment_id,
    service_slug,
    duration_days,
    version,
    status,
    generated_content,
    edited_content,
    source_snapshot,
    generator_provider,
    generator_model,
    prompt_version
  ) values (
    v_workspace.id,
    v_workspace.payment_id,
    v_workspace.service_slug,
    30,
    v_version,
    'draft',
    p_generated_content,
    p_generated_content,
    p_source_snapshot,
    p_generator_provider,
    p_generator_model,
    p_prompt_version
  )
  returning * into v_plan;

  return v_plan;
end;
$$;

comment on table public.client_strategy_plans is
  'Private, versioned AI-assisted career development plans. Legacy Career Clarity records may retain a 14-day duration; new plans use a 30, 60, or 90-day content horizon and store a 30-day base duration.';

select pg_notify('pgrst', 'reload schema');
