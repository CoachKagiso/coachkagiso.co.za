create table if not exists public.google_auth (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  refresh_token text not null,
  access_token text,
  token_expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_auth_single_row_idx
  on public.google_auth ((true));

alter table public.google_auth enable row level security;

grant select, insert, update, delete on table public.google_auth to service_role;
