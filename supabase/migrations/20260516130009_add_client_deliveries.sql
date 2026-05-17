create table if not exists public.client_deliveries (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  stage_name text not null,
  stage_order integer not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint client_deliveries_payment_stage_unique unique (payment_id, stage_order)
);

create index if not exists client_deliveries_payment_id_idx
  on public.client_deliveries (payment_id);

create index if not exists client_deliveries_completed_idx
  on public.client_deliveries (completed);

alter table public.client_deliveries enable row level security;

grant select, insert, update on table public.client_deliveries to service_role;
