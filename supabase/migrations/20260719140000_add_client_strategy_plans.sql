create table if not exists public.client_strategy_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.client_strategy_workspaces(id) on delete cascade,
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null,
  duration_days integer not null,
  version integer not null,
  status text not null default 'draft',
  generated_content jsonb not null,
  edited_content jsonb not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  generator_provider text not null,
  generator_model text not null,
  prompt_version text not null,
  generated_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_strategy_plans_workspace_version_unique unique (workspace_id, version),
  constraint client_strategy_plans_service_check
    check (service_slug in ('career-clarity', 'glow-up-vip')),
  constraint client_strategy_plans_duration_check
    check (
      (service_slug = 'career-clarity' and duration_days = 14)
      or (service_slug = 'glow-up-vip' and duration_days = 30)
    ),
  constraint client_strategy_plans_status_check
    check (status in ('draft', 'approved', 'sent', 'superseded')),
  constraint client_strategy_plans_version_check check (version > 0),
  constraint client_strategy_plans_approval_check
    check (
      (status = 'draft' and approved_at is null and approved_by is null)
      or (status in ('approved', 'sent') and approved_at is not null and approved_by is not null)
      or status = 'superseded'
    )
);

create index if not exists client_strategy_plans_payment_idx
  on public.client_strategy_plans (payment_id, version desc);

create unique index if not exists client_strategy_plans_one_draft_idx
  on public.client_strategy_plans (workspace_id)
  where status = 'draft';

create unique index if not exists client_strategy_plans_one_approved_idx
  on public.client_strategy_plans (workspace_id)
  where status = 'approved';

create or replace function public.guard_client_strategy_plan_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
    or new.payment_id is distinct from old.payment_id
    or new.service_slug is distinct from old.service_slug
    or new.duration_days is distinct from old.duration_days
    or new.version is distinct from old.version
    or new.generated_content is distinct from old.generated_content
    or new.source_snapshot is distinct from old.source_snapshot
    or new.generator_provider is distinct from old.generator_provider
    or new.generator_model is distinct from old.generator_model
    or new.prompt_version is distinct from old.prompt_version
    or new.generated_at is distinct from old.generated_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Generated plan provenance is immutable';
  end if;

  if old.status <> 'draft' and new.edited_content is distinct from old.edited_content then
    raise exception 'Only a draft plan can be edited';
  end if;

  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'A superseded plan cannot be reopened';
  end if;

  if old.status = 'sent' and new.status not in ('sent', 'superseded') then
    raise exception 'A sent plan cannot return to draft or approved';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_client_strategy_plan_update_trigger
  on public.client_strategy_plans;

create trigger guard_client_strategy_plan_update_trigger
before update on public.client_strategy_plans
for each row execute function public.guard_client_strategy_plan_update();

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
    case when v_workspace.service_slug = 'career-clarity' then 14 else 30 end,
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

create or replace function public.approve_client_strategy_plan(
  p_plan_id uuid,
  p_approved_by text
)
returns public.client_strategy_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.client_strategy_plans%rowtype;
begin
  select *
  into v_plan
  from public.client_strategy_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Strategy plan not found';
  end if;

  if v_plan.status <> 'draft' then
    raise exception 'Only a draft plan can be approved';
  end if;

  update public.client_strategy_plans
  set status = 'superseded'
  where workspace_id = v_plan.workspace_id and status = 'approved';

  update public.client_strategy_plans
  set
    status = 'approved',
    approved_by = nullif(trim(p_approved_by), ''),
    approved_at = now()
  where id = p_plan_id
  returning * into v_plan;

  if v_plan.approved_by is null then
    raise exception 'Approver is required';
  end if;

  return v_plan;
end;
$$;

alter table public.client_strategy_plans enable row level security;

revoke all privileges on table public.client_strategy_workspaces from PUBLIC, anon, authenticated;
revoke all privileges on table public.client_strategy_workspace_revisions from PUBLIC, anon, authenticated;
revoke all privileges on table public.client_strategy_plans from PUBLIC, anon, authenticated;

grant select, insert, update on table public.client_strategy_workspaces to service_role;
grant select, insert on table public.client_strategy_workspace_revisions to service_role;
grant select, insert, update on table public.client_strategy_plans to service_role;

revoke all on function public.create_client_strategy_plan(uuid, jsonb, jsonb, text, text, text)
  from PUBLIC, anon, authenticated;
revoke all on function public.approve_client_strategy_plan(uuid, text)
  from PUBLIC, anon, authenticated;

grant execute on function public.create_client_strategy_plan(uuid, jsonb, jsonb, text, text, text)
  to service_role;
grant execute on function public.approve_client_strategy_plan(uuid, text)
  to service_role;

comment on table public.client_strategy_plans is
  'Private, versioned AI-assisted support plans. Generated content is immutable and edited content locks at approval.';

select pg_notify('pgrst', 'reload schema');
