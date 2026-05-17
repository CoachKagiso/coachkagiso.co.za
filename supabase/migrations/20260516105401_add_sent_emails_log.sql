create table if not exists public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  to_email text not null,
  to_name text not null,
  subject text not null,
  body text not null,
  template_id text,
  archetype text,
  service_interest text,
  sent_at timestamptz not null default now()
);

create index if not exists sent_emails_lead_id_idx
  on public.sent_emails (lead_id);

create index if not exists sent_emails_sent_at_idx
  on public.sent_emails (sent_at desc);

create index if not exists sent_emails_archetype_idx
  on public.sent_emails (archetype);

alter table public.sent_emails enable row level security;

grant select, insert on table public.sent_emails to service_role;
