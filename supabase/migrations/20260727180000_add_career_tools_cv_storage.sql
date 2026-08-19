alter table public.payments
  add column if not exists current_cv_path text;

create table if not exists public.client_cv_versions (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id),
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  extension text not null,
  size_bytes integer not null,
  source text not null default 'analyzer',
  created_at timestamptz not null default now(),

  constraint client_cv_versions_extension_check check (extension in ('pdf', 'docx', 'txt')),
  constraint client_cv_versions_source_check check (source in ('analyzer', 'intake', 'manual', 'cal-import')),
  constraint client_cv_versions_size_check check (size_bytes > 0)
);

create index if not exists client_cv_versions_payment_idx
  on public.client_cv_versions (payment_id, created_at desc);

create table if not exists public.cv_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id),
  report jsonb not null,
  analysis_mode text not null default 'simple',
  target_role text,
  cv_file_name text,
  cv_path text,
  version integer not null default 1,
  created_at timestamptz not null default now(),

  constraint cv_analysis_reports_mode_check check (analysis_mode in ('simple', 'advanced')),
  constraint cv_analysis_reports_version_check check (version > 0)
);

create index if not exists cv_analysis_reports_payment_idx
  on public.cv_analysis_reports (payment_id, created_at desc);

alter table public.client_cv_versions enable row level security;
alter table public.cv_analysis_reports enable row level security;

revoke all privileges on table public.client_cv_versions from PUBLIC, anon, authenticated;
revoke all privileges on table public.cv_analysis_reports from PUBLIC, anon, authenticated;

grant select, insert on table public.client_cv_versions to service_role;
grant select, insert on table public.cv_analysis_reports to service_role;

comment on column public.payments.current_cv_path is
  'Storage path for the latest retained CV version. Older versions remain in client_cv_versions indefinitely.';

comment on table public.client_cv_versions is
  'Permanent, append-only CV file history for each paid client engagement.';

comment on table public.cv_analysis_reports is
  'Permanent, timestamped CV Analyzer reports linked to the client engagement and CV version used.';

update public.client_strategy_workspaces
set debrief = '{}'::jsonb,
    last_changed_by = 'manual-cleanup'
where payment_id in ('manual-career-clarity-test-001', 'manual-glow-up-vip-test-002');

select pg_notify('pgrst', 'reload schema');
