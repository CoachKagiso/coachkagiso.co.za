alter table public.content_calendar
  drop constraint if exists content_calendar_platform_check;

alter table public.content_calendar
  add constraint content_calendar_platform_check
  check (platform in ('linkedin', 'tiktok', 'instagram', 'facebook', 'email'));

alter table public.content_backlog
  drop constraint if exists content_backlog_platform_check;

alter table public.content_backlog
  add constraint content_backlog_platform_check
  check (platform in ('linkedin', 'tiktok', 'instagram', 'facebook', 'email'));
