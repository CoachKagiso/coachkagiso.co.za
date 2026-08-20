alter table public.dashboard_notifications
  drop constraint if exists dashboard_notifications_event_type_check;

alter table public.dashboard_notifications
  add constraint dashboard_notifications_event_type_check
  check (event_type in (
    'lead_magnet_download',
    'masterclass_reservation',
    'payment_confirmed',
    'intake_submitted',
    'cal_booking',
    'email_backlog_due'
  ));

comment on constraint dashboard_notifications_event_type_check on public.dashboard_notifications is
  'Allowed dashboard notification events, including the daily overdue follow-up email digest.';
