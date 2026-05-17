create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'cal',
  event_type text,
  booking_uid text,
  email text,
  matched boolean not null default false,
  lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  payload jsonb,
  error text,
  created_at timestamptz not null default now()
);

alter table public.webhook_logs enable row level security;

create index if not exists webhook_logs_created_at_idx
  on public.webhook_logs (created_at desc);

create index if not exists webhook_logs_email_idx
  on public.webhook_logs (lower(email))
  where email is not null;

create index if not exists webhook_logs_lead_id_idx
  on public.webhook_logs (lead_id)
  where lead_id is not null;

comment on table public.webhook_logs is
  'Private audit log for external webhook events handled by server-side service-role routes.';
