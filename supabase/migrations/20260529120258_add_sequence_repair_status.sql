alter table public.diagnostic_submissions
  add column if not exists sequence_repair_status text,
  add column if not exists sequence_repaired_at timestamptz;

alter table public.diagnostic_submissions
  drop constraint if exists diagnostic_submissions_sequence_repair_status_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_sequence_repair_status_check
  check (
    sequence_repair_status is null
    or sequence_repair_status in ('recovery_sent', 'resolved', 'manual')
  );

create index if not exists diagnostic_submissions_sequence_repair_idx
  on public.diagnostic_submissions (sequence_repair_status)
  where sequence_repair_status is not null;

select pg_notify('pgrst', 'reload schema');
