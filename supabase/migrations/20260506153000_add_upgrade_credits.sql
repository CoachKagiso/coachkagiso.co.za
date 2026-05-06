create table if not exists public.upgrade_credits (
  id uuid primary key default gen_random_uuid(),
  source_payment_id text not null references public.payments(payment_id) on delete cascade,
  source_service_slug text not null,
  target_service_slug text not null,
  buyer_email text,
  buyer_name text,
  token text not null unique,
  credit_amount numeric not null,
  discounted_amount numeric not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  used_by_payment_id text references public.payments(payment_id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create unique index if not exists upgrade_credits_source_target_key
  on public.upgrade_credits (source_payment_id, target_service_slug);

alter table public.upgrade_credits enable row level security;

insert into public.upgrade_credits (
  source_payment_id,
  source_service_slug,
  target_service_slug,
  buyer_email,
  buyer_name,
  token,
  credit_amount,
  discounted_amount,
  expires_at,
  status
)
select
  p.payment_id,
  'cv-review',
  'cv-revamp',
  p.buyer_email,
  p.buyer_name,
  concat('cku_', encode(gen_random_bytes(12), 'hex')),
  150,
  250,
  coalesce(p.confirmed_at, p.created_at) + interval '7 days',
  case
    when coalesce(p.confirmed_at, p.created_at) + interval '7 days' < now() then 'expired'
    else 'active'
  end
from public.payments p
where p.service_slug = 'cv-review'
  and p.status = 'confirmed'
  and not exists (
    select 1
    from public.upgrade_credits c
    where c.source_payment_id = p.payment_id
      and c.target_service_slug = 'cv-revamp'
  );
