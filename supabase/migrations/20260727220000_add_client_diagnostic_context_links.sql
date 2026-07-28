create table if not exists public.client_diagnostic_context_links (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  diagnostic_submission_id uuid not null references public.diagnostic_submissions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'included', 'excluded', 'revoked')),
  match_method text not null
    check (match_method in ('email', 'manual')),
  consent_source text
    check (consent_source in ('future_form', 'direct_client')),
  consent_recorded_at timestamptz,
  status_changed_at timestamptz not null default now(),
  status_changed_by text not null default 'kagiso_dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_diagnostic_context_links_payment_unique unique (payment_id)
);

create index if not exists client_diagnostic_context_links_diagnostic_idx
  on public.client_diagnostic_context_links (diagnostic_submission_id);

revoke all privileges on table public.client_diagnostic_context_links from anon, authenticated;
grant select, insert, update, delete on table public.client_diagnostic_context_links to service_role;

comment on table public.client_diagnostic_context_links is
  'Coach-controlled, consent-gated links between paid engagements and earlier diagnostic submissions.';

select pg_notify('pgrst', 'reload schema');
