alter table public.diagnostic_submissions
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists source text,
  add column if not exists download_link text;

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
  drop constraint if exists diagnostic_submissions_lead_status_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_lead_status_check
  check (
    lead_status in (
      'new',
      'contacted',
      'discovery_booked',
      'paid',
      'follow_up_later',
      'not_a_fit',
      'nurture',
      'closed',
      'archived'
    )
  );

create index if not exists diagnostic_submissions_next_follow_up_idx
  on public.diagnostic_submissions (next_follow_up_at)
  where lead_status = 'contacted';

create index if not exists diagnostic_submissions_source_idx
  on public.diagnostic_submissions (source);

create table if not exists public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  to_email text not null,
  to_name text not null,
  subject text not null,
  body text not null,
  template_id text,
  archetype text,
  service_interest text,
  sent_at timestamptz not null default now()
);

create index if not exists sent_emails_lead_id_idx
  on public.sent_emails (lead_id);

create index if not exists sent_emails_sent_at_idx
  on public.sent_emails (sent_at desc);

create index if not exists sent_emails_archetype_idx
  on public.sent_emails (archetype);

alter table public.sent_emails enable row level security;

grant select, insert on table public.sent_emails to service_role;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);

insert into public.settings (key, value) values
  ('business_profile', '{"name": "Coach Kagiso", "email": "hello@coachkagiso.co.za", "website": "coachkagiso.co.za", "timezone": "Africa/Johannesburg", "profilePhotoUrl": "/images/author/ck-profile.png"}'::jsonb),
  ('services', '[
    {"name": "48-Hour CV Review", "slug": "cv-review-48hr", "price": 150, "turnaround": "2 working days", "active": true},
    {"name": "CV Revamp", "slug": "cv-revamp", "price": 400, "turnaround": "5 working days", "active": true},
    {"name": "Cover Letter", "slug": "cover-letter", "price": 150, "turnaround": "5 working days", "active": true},
    {"name": "LinkedIn Optimisation", "slug": "linkedin-optimisation", "price": 300, "turnaround": "5 working days", "active": true},
    {"name": "CV + LinkedIn Bundle", "slug": "cv-linkedin-bundle", "price": 500, "turnaround": "7 working days", "active": true},
    {"name": "Career Clarity Session", "slug": "career-clarity", "price": 800, "turnaround": "Session-based", "active": true},
    {"name": "Glow Up VIP Package", "slug": "glow-up-vip", "price": 1200, "turnaround": "30 days", "active": true},
    {"name": "Saturday Masterclass", "slug": "saturday-masterclass", "price": 450, "turnaround": "Cohort-based", "active": true},
    {"name": "First 90 Days Coaching", "slug": "first-90-days", "price": 900, "turnaround": "Session-based", "active": true},
    {"name": "Leadership Launchpad", "slug": "leadership-launchpad", "price": 2000, "turnaround": "Session-based", "active": true}
  ]'::jsonb),
  ('business_hours', '{"weekdays": {"start": "17:30", "end": "19:00"}, "saturday": {"start": "09:00", "end": "12:00"}, "sunday": null}'::jsonb),
  ('ai_config', '{"primary_model": "glm-5.2", "secondary_model": "glm-5.2", "model_provider": "zai", "zai_api_key": "", "openrouter_api_key": "", "test_mode": true}'::jsonb),
  ('notifications', '{"new_lead": true, "follow_up_due": true, "overdue_delivery": true, "payment_confirmed": true, "cal_booking": true, "sent_email_log": false, "lead_magnet_download": true, "masterclass_reservation": true, "intake_submitted": true}'::jsonb)
on conflict (key) do nothing;

alter table public.settings enable row level security;

grant select, insert, update on table public.settings to service_role;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text,
  archetype_name text,
  subject text,
  body text,
  recommended_service text,
  booking_key text,
  source text,
  download_key text,
  variant integer,
  sequence_index integer,
  stage_label text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
);

alter table public.email_templates
  add column if not exists template_id text,
  add column if not exists archetype_name text,
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists recommended_service text,
  add column if not exists booking_key text,
  add column if not exists source text,
  add column if not exists download_key text,
  add column if not exists variant integer,
  add column if not exists sequence_index integer,
  add column if not exists stage_label text,
  add column if not exists active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.email_templates
set
  template_id = coalesce(template_id, id::text),
  archetype_name = coalesce(archetype_name, ''),
  subject = coalesce(subject, ''),
  body = coalesce(body, ''),
  recommended_service = coalesce(recommended_service, ''),
  booking_key = coalesce(booking_key, ''),
  source = coalesce(source, 'diagnostic'),
  variant = coalesce(variant, 1),
  sequence_index = coalesce(sequence_index, 1),
  stage_label = coalesce(stage_label, 'First contact'),
  active = coalesce(active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.email_templates
  alter column template_id set not null,
  alter column archetype_name set not null,
  alter column subject set not null,
  alter column body set not null,
  alter column recommended_service set not null,
  alter column booking_key set not null,
  alter column source set default 'diagnostic',
  alter column source set not null,
  alter column variant set default 1,
  alter column variant set not null,
  alter column sequence_index set default 1,
  alter column sequence_index set not null,
  alter column stage_label set default 'First contact',
  alter column stage_label set not null,
  alter column active set default true,
  alter column active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.email_templates
  drop constraint if exists email_templates_template_id_key;

alter table public.email_templates
  add constraint email_templates_template_id_key unique (template_id);

alter table public.email_templates
  drop constraint if exists email_templates_source_check;

alter table public.email_templates
  add constraint email_templates_source_check
  check (source in ('diagnostic', 'first_90_days', 'linkedin_headline', 'masterclass_waitlist'));

create index if not exists email_templates_source_idx
  on public.email_templates (source);

alter table public.email_templates enable row level security;

grant select, insert, update on table public.email_templates to service_role;

alter table public.dashboard_notifications enable row level security;

grant select, insert, update, delete on table public.dashboard_notifications to service_role;

update public.settings
set value = coalesce(value, '{}'::jsonb) || '{
  "lead_magnet_download": true,
  "masterclass_reservation": true,
  "intake_submitted": true
}'::jsonb
where key = 'notifications';

select pg_notify('pgrst', 'reload schema');
