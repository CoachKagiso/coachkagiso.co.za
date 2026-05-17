create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pillar text not null check (pillar in ('career_growth', 'leadership', 'personal_brand', 'mentorship')),
  platform text not null check (platform in ('linkedin', 'tiktok', 'instagram', 'facebook', 'email')),
  publish_date date not null,
  status text not null default 'idea' check (status in ('idea', 'draft', 'scheduled', 'published')),
  draft_content text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_backlog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pillar text check (pillar in ('career_growth', 'leadership', 'personal_brand', 'mentorship')),
  platform text check (platform in ('linkedin', 'tiktok', 'instagram', 'facebook', 'email')),
  status text not null default 'idea' check (status in ('idea', 'draft', 'in_progress', 'used')),
  source text not null default 'manual' check (source in ('signal_brief', 'create', 'manual')),
  content text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_calendar_publish_date_idx
  on public.content_calendar (publish_date);

create index if not exists content_calendar_status_idx
  on public.content_calendar (status);

create index if not exists content_calendar_pillar_idx
  on public.content_calendar (pillar);

create index if not exists content_backlog_created_at_idx
  on public.content_backlog (created_at desc);

create index if not exists content_backlog_status_idx
  on public.content_backlog (status);

create index if not exists content_backlog_pillar_idx
  on public.content_backlog (pillar);

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

alter table public.content_calendar enable row level security;
alter table public.content_backlog enable row level security;

grant select, insert, update, delete on table public.content_calendar to service_role;
grant select, insert, update, delete on table public.content_backlog to service_role;

create or replace function public.set_dashboard_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_calendar_updated_at on public.content_calendar;
create trigger set_content_calendar_updated_at
before update on public.content_calendar
for each row
execute function public.set_dashboard_updated_at();

drop trigger if exists set_content_backlog_updated_at on public.content_backlog;
create trigger set_content_backlog_updated_at
before update on public.content_backlog
for each row
execute function public.set_dashboard_updated_at();
