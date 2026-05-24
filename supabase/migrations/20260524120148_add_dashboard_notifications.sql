create table if not exists public.dashboard_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'system',
  title text not null,
  description text,
  contact_name text,
  contact_email text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz,

  constraint dashboard_notifications_event_type_check
    check (event_type in (
      'lead_magnet_download',
      'masterclass_reservation',
      'payment_confirmed',
      'intake_submitted',
      'cal_booking'
    )),
  constraint dashboard_notifications_status_check
    check (status in ('unread', 'read', 'archived'))
);

create index if not exists dashboard_notifications_status_created_at_idx
  on public.dashboard_notifications (status, created_at desc);

create index if not exists dashboard_notifications_event_type_created_at_idx
  on public.dashboard_notifications (event_type, created_at desc);

create index if not exists dashboard_notifications_contact_email_idx
  on public.dashboard_notifications (lower(contact_email))
  where contact_email is not null;

alter table public.dashboard_notifications enable row level security;

grant select, insert, update, delete on table public.dashboard_notifications to service_role;

comment on table public.dashboard_notifications is
  'Private dashboard attention stream for non-diagnostic funnel events handled by server-side routes.';

do $$
begin
  if to_regclass('public.settings') is not null then
    execute $sql$
      update public.settings
      set value = coalesce(value, '{}'::jsonb) || '{
        "lead_magnet_download": true,
        "masterclass_reservation": true,
        "intake_submitted": true
      }'::jsonb
      where key = 'notifications'
    $sql$;
  end if;
end $$;
