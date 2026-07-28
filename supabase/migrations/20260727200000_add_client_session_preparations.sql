create table if not exists public.client_session_preparations (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id),
  service_slug text not null,
  version integer not null,
  content jsonb not null,
  source_snapshot jsonb not null,
  generator_provider text not null,
  generator_model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),

  constraint client_session_preparations_service_check check (service_slug in ('career-clarity', 'glow-up-vip')),
  constraint client_session_preparations_version_check check (version > 0),
  constraint client_session_preparations_version_unique unique (payment_id, version)
);

create index if not exists client_session_preparations_payment_idx
  on public.client_session_preparations (payment_id, version desc);

alter table public.client_session_preparations enable row level security;

revoke all privileges on table public.client_session_preparations from PUBLIC, anon, authenticated;
grant select, insert on table public.client_session_preparations to service_role;

comment on table public.client_session_preparations is
  'Permanent append-only AI-assisted session preparation drafts. Each version preserves its source snapshot.';

select pg_notify('pgrst', 'reload schema');
