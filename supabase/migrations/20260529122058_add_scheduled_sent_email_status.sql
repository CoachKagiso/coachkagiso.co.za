alter table public.sent_emails
  add column if not exists scheduled_at timestamptz;

alter table public.sent_emails
  drop constraint if exists sent_emails_status_check;

alter table public.sent_emails
  drop constraint if exists sent_emails_delivery_status_check;

alter table public.sent_emails
  add constraint sent_emails_delivery_status_check
  check (
    delivery_status is null
    or delivery_status in (
      'sent',
      'scheduled',
      'delivered',
      'opened',
      'clicked',
      'failed',
      'bounced',
      'blocked',
      'deferred',
      'logged'
    )
  );

create index if not exists sent_emails_scheduled_at_idx
  on public.sent_emails (scheduled_at)
  where scheduled_at is not null;

select pg_notify('pgrst', 'reload schema');
