alter table public.sent_emails
  add column if not exists origin text not null default 'dashboard',
  add column if not exists external_provider text,
  add column if not exists external_message_id text,
  add column if not exists delivery_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz;

create unique index if not exists sent_emails_external_message_idx
  on public.sent_emails (external_provider, external_message_id)
  where external_provider is not null and external_message_id is not null;

create index if not exists sent_emails_to_email_idx
  on public.sent_emails (lower(to_email));

create index if not exists sent_emails_origin_idx
  on public.sent_emails (origin);

grant select, insert, update, delete on table public.sent_emails to service_role;

select pg_notify('pgrst', 'reload schema');
