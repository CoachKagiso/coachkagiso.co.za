alter table public.diagnostic_submissions
  add column if not exists coaching_context_consent boolean not null default false,
  add column if not exists coaching_context_consent_at timestamptz,
  add column if not exists coaching_context_consent_version text;

comment on column public.diagnostic_submissions.coaching_context_consent is
  'Optional, explicit permission to use this diagnostic as context if the person later books coaching.';

comment on column public.diagnostic_submissions.coaching_context_consent_at is
  'When the diagnostic respondent granted coaching-context permission.';

comment on column public.diagnostic_submissions.coaching_context_consent_version is
  'Version of the exact coaching-context consent wording shown to the respondent.';
