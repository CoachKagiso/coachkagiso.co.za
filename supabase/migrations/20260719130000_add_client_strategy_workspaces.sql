create table if not exists public.client_strategy_workspaces (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null,
  status text not null default 'draft',
  debrief jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  last_changed_by text not null default 'dashboard_admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_strategy_workspaces_payment_unique unique (payment_id),
  constraint client_strategy_workspaces_service_check
    check (service_slug in ('career-clarity', 'glow-up-vip')),
  constraint client_strategy_workspaces_version_check check (version > 0)
);

create table if not exists public.client_strategy_workspace_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.client_strategy_workspaces(id) on delete cascade,
  payment_id text not null references public.payments(payment_id) on delete cascade,
  version integer not null,
  status text not null,
  debrief jsonb not null,
  changed_by text not null,
  created_at timestamptz not null default now(),

  constraint client_strategy_workspace_revision_unique unique (workspace_id, version)
);

create index if not exists client_strategy_workspaces_service_idx
  on public.client_strategy_workspaces (service_slug, updated_at desc);

create index if not exists client_strategy_workspace_revisions_payment_idx
  on public.client_strategy_workspace_revisions (payment_id, version desc);

create or replace function public.prepare_client_strategy_workspace_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.audit_client_strategy_workspace_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.client_strategy_workspace_revisions (
    workspace_id,
    payment_id,
    version,
    status,
    debrief,
    changed_by
  ) values (
    new.id,
    new.payment_id,
    new.version,
    new.status,
    new.debrief,
    new.last_changed_by
  );

  return new;
end;
$$;

drop trigger if exists prepare_client_strategy_workspace_revision_trigger
  on public.client_strategy_workspaces;

create trigger prepare_client_strategy_workspace_revision_trigger
before update on public.client_strategy_workspaces
for each row execute function public.prepare_client_strategy_workspace_revision();

drop trigger if exists audit_client_strategy_workspace_revision_trigger
  on public.client_strategy_workspaces;

create trigger audit_client_strategy_workspace_revision_trigger
after insert or update on public.client_strategy_workspaces
for each row execute function public.audit_client_strategy_workspace_revision();

alter table public.client_strategy_workspaces enable row level security;
alter table public.client_strategy_workspace_revisions enable row level security;

grant select, insert, update on table public.client_strategy_workspaces to service_role;
grant select, insert on table public.client_strategy_workspace_revisions to service_role;

comment on table public.client_strategy_workspaces is
  'Private engagement workspace used to prepare personalized post-session support.';

comment on table public.client_strategy_workspace_revisions is
  'Append-only snapshots created automatically whenever a strategy workspace is saved.';
