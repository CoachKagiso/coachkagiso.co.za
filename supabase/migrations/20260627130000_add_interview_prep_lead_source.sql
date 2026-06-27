-- Allow the Interview Prep Checklist lead magnet as a lead source on submissions and email templates.

alter table public.diagnostic_submissions
  drop constraint if exists diagnostic_submissions_source_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_source_check
  check (source in ('diagnostic', 'first_90_days', 'linkedin_headline', 'cv_checklist', 'interview_prep', 'masterclass_waitlist'));

alter table public.email_templates
  drop constraint if exists email_templates_source_check;

alter table public.email_templates
  add constraint email_templates_source_check
  check (source in ('diagnostic', 'first_90_days', 'linkedin_headline', 'cv_checklist', 'interview_prep', 'masterclass_waitlist'));
