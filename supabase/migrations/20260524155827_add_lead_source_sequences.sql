alter table public.diagnostic_submissions
  add column if not exists source text;

update public.diagnostic_submissions
set source = 'diagnostic'
where source is null;

alter table public.diagnostic_submissions
  alter column source set default 'diagnostic',
  alter column source set not null;

alter table public.diagnostic_submissions
  drop constraint if exists diagnostic_submissions_source_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_source_check
  check (source in ('diagnostic', 'first_90_days', 'linkedin_headline', 'masterclass_waitlist'));

alter table public.diagnostic_submissions
  add column if not exists download_link text;

create index if not exists diagnostic_submissions_source_idx
  on public.diagnostic_submissions (source);

alter table public.email_templates
  add column if not exists source text;

update public.email_templates
set source = 'diagnostic'
where source is null;

alter table public.email_templates
  alter column source set default 'diagnostic',
  alter column source set not null;

alter table public.email_templates
  drop constraint if exists email_templates_source_check;

alter table public.email_templates
  add constraint email_templates_source_check
  check (source in ('diagnostic', 'first_90_days', 'linkedin_headline', 'masterclass_waitlist'));

alter table public.email_templates
  add column if not exists download_key text;

create index if not exists email_templates_source_idx
  on public.email_templates (source);
