alter table public.content_backlog
  drop constraint if exists content_backlog_source_check;

alter table public.content_backlog
  add constraint content_backlog_source_check
  check (source in ('signal_brief', 'create', 'manual', 'insights', 'assistant'));
