create table if not exists public.client_session_evidence (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null,
  version integer not null,
  replaces_evidence_id uuid null references public.client_session_evidence(id),
  change_reason text not null,
  file_name text null,
  content_type text null,
  extension text null,
  size_bytes integer null,
  storage_path text null,
  extracted_text text not null default '',
  extraction_truncated boolean not null default false,
  additional_context text not null default '',
  created_at timestamptz not null default now(),

  constraint client_session_evidence_service_check
    check (service_slug in ('career-clarity', 'glow-up-vip')),
  constraint client_session_evidence_version_check check (version > 0),
  constraint client_session_evidence_reason_check
    check (change_reason in ('upload', 'context_update', 'remove_file')),
  constraint client_session_evidence_version_unique unique (payment_id, version)
);

create index if not exists client_session_evidence_payment_idx
  on public.client_session_evidence (payment_id, version desc);

create table if not exists public.client_session_evidence_suggestions (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null,
  evidence_id uuid not null references public.client_session_evidence(id) on delete cascade,
  preparation_id uuid not null references public.client_session_preparations(id),
  suggestions jsonb not null,
  generator_provider text not null,
  generator_model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),

  constraint client_session_evidence_suggestions_service_check
    check (service_slug in ('career-clarity', 'glow-up-vip'))
);

create index if not exists client_session_evidence_suggestions_payment_idx
  on public.client_session_evidence_suggestions (payment_id, created_at desc);

alter table public.client_session_evidence enable row level security;
alter table public.client_session_evidence_suggestions enable row level security;

revoke all privileges on table public.client_session_evidence from PUBLIC, anon, authenticated;
revoke all privileges on table public.client_session_evidence_suggestions from PUBLIC, anon, authenticated;
grant select, insert on table public.client_session_evidence to service_role;
grant select, insert on table public.client_session_evidence_suggestions to service_role;

comment on table public.client_session_evidence is
  'Private append-only session transcript and coach-note revisions. Raw files remain in private storage while extracted text is stored separately.';

comment on table public.client_session_evidence_suggestions is
  'Private AI-assisted debrief suggestions with evidence and session-preparation provenance. Suggestions require coach review before use.';

select pg_notify('pgrst', 'reload schema');
