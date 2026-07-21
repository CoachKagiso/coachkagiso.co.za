alter table public.intake_submissions
  add column if not exists source text not null default 'native_form',
  add column if not exists source_reference text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'intake_submissions_source_reference_unique'
      and conrelid = 'public.intake_submissions'::regclass
  ) then
    alter table public.intake_submissions
      add constraint intake_submissions_source_reference_unique
      unique (source, source_reference);
  end if;
end
$$;

create index if not exists intake_submissions_source_idx
  on public.intake_submissions (source);

comment on column public.intake_submissions.source is
  'System that collected the intake, such as native_form or cal.';

comment on column public.intake_submissions.source_reference is
  'Stable external reference used to make source ingestion idempotent.';

comment on column public.intake_submissions.source_metadata is
  'Private source metadata kept separate from client-visible intake answers.';
