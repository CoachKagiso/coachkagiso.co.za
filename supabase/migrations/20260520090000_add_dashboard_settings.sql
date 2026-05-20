create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);

insert into settings (key, value) values
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
  ('ai_config', '{"primary_model": "glm-5.1", "secondary_model": "glm-5.1", "model_provider": "zai", "zai_api_key": "", "openrouter_api_key": "", "test_mode": true}'::jsonb),
  ('notifications', '{"new_lead": true, "follow_up_due": true, "overdue_delivery": true, "payment_confirmed": true, "cal_booking": true, "sent_email_log": false}'::jsonb)
on conflict (key) do nothing;

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null unique,
  archetype_name text not null,
  subject text not null,
  body text not null,
  recommended_service text not null,
  booking_key text not null,
  variant integer not null default 1,
  sequence_index integer not null default 1,
  stage_label text not null default 'First contact',
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
