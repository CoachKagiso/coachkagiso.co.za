create table if not exists public.inbound_email_replies (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'zoho',
  provider_message_id text not null,
  provider_thread_id text,
  mailbox text not null default 'hello@coachkagiso.co.za',
  from_email text not null,
  from_name text,
  to_email text,
  subject text,
  body text not null,
  received_at timestamptz not null,
  lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  sent_email_id uuid references public.sent_emails(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  reply_subject text,
  reply_draft text,
  reply_short_draft text,
  draft_status text not null default 'drafted' check (draft_status in ('drafted', 'approved', 'sent', 'dismissed')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inbound_email_replies_provider_message_idx
  on public.inbound_email_replies (provider, provider_message_id);

create index if not exists inbound_email_replies_from_email_idx
  on public.inbound_email_replies (lower(from_email));

create index if not exists inbound_email_replies_received_at_idx
  on public.inbound_email_replies (received_at desc);

create index if not exists inbound_email_replies_lead_id_idx
  on public.inbound_email_replies (lead_id);

create index if not exists inbound_email_replies_status_idx
  on public.inbound_email_replies (status);

alter table public.inbound_email_replies enable row level security;

drop trigger if exists set_inbound_email_replies_updated_at on public.inbound_email_replies;
create trigger set_inbound_email_replies_updated_at
before update on public.inbound_email_replies
for each row
execute function public.set_dashboard_updated_at();

revoke all privileges on table public.inbound_email_replies from anon, authenticated;
grant select, insert, update, delete on table public.inbound_email_replies to service_role;

select pg_notify('pgrst', 'reload schema');
