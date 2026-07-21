create table if not exists public.client_strategy_plan_deliveries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.client_strategy_plans(id) on delete cascade,
  payment_id text not null references public.payments(payment_id) on delete cascade,
  status text not null default 'sending',
  recipient_email text not null,
  recipient_name text not null,
  subject text not null,
  provider text,
  provider_message_id text,
  attempt_count integer not null default 1,
  error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_strategy_plan_deliveries_plan_unique unique (plan_id),
  constraint client_strategy_plan_deliveries_status_check
    check (status in ('sending', 'sent', 'failed')),
  constraint client_strategy_plan_deliveries_recipient_check
    check (position('@' in recipient_email) > 1),
  constraint client_strategy_plan_deliveries_attempt_check
    check (attempt_count > 0),
  constraint client_strategy_plan_deliveries_sent_check
    check (
      (status = 'sent' and provider is not null and provider_message_id is not null and delivered_at is not null)
      or (status in ('sending', 'failed') and delivered_at is null)
    )
);

create unique index if not exists client_strategy_plan_deliveries_provider_message_idx
  on public.client_strategy_plan_deliveries (provider, provider_message_id)
  where provider_message_id is not null;

create index if not exists client_strategy_plan_deliveries_payment_idx
  on public.client_strategy_plan_deliveries (payment_id, created_at desc);

create table if not exists public.client_strategy_checkpoints (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.client_strategy_plans(id) on delete cascade,
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null,
  checkpoint_key text not null,
  label text not null,
  due_at timestamptz not null,
  status text not null default 'pending',
  progress_status text,
  notes text not null default '',
  theme_keys text[] not null default '{}'::text[],
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_strategy_checkpoints_plan_key_unique unique (plan_id, checkpoint_key),
  constraint client_strategy_checkpoints_service_check
    check (service_slug in ('career-clarity', 'glow-up-vip')),
  constraint client_strategy_checkpoints_key_check
    check (checkpoint_key in ('day_7', 'day_14', 'day_21', 'day_30')),
  constraint client_strategy_checkpoints_status_check
    check (status in ('pending', 'completed', 'skipped')),
  constraint client_strategy_checkpoints_progress_check
    check (progress_status is null or progress_status in ('on_track', 'partly_on_track', 'blocked', 'complete')),
  constraint client_strategy_checkpoints_notes_check
    check (char_length(notes) <= 4000),
  constraint client_strategy_checkpoints_themes_check
    check (
      cardinality(theme_keys) <= 5
      and theme_keys <@ array[
        'career_direction',
        'confidence_language',
        'evidence_gap',
        'cv_positioning',
        'linkedin_visibility',
        'interview_readiness',
        'application_strategy',
        'accountability',
        'capacity',
        'role_fit'
      ]::text[]
    ),
  constraint client_strategy_checkpoints_outcome_check
    check (
      (status = 'pending' and progress_status is null and completed_at is null)
      or (status = 'completed' and progress_status is not null and completed_at is not null)
      or (status = 'skipped' and progress_status is null and cardinality(theme_keys) = 0 and completed_at is not null)
    )
);

create index if not exists client_strategy_checkpoints_payment_idx
  on public.client_strategy_checkpoints (payment_id, due_at);

create index if not exists client_strategy_checkpoints_pending_due_idx
  on public.client_strategy_checkpoints (due_at)
  where status = 'pending';

create or replace function public.reserve_client_strategy_plan_delivery(
  p_plan_id uuid,
  p_subject text
)
returns public.client_strategy_plan_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.client_strategy_plans%rowtype;
  v_payment public.payments%rowtype;
  v_delivery public.client_strategy_plan_deliveries%rowtype;
begin
  select *
  into v_plan
  from public.client_strategy_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Strategy plan not found';
  end if;

  if v_plan.status <> 'approved' then
    raise exception 'Only an approved plan can be sent';
  end if;

  select *
  into v_payment
  from public.payments
  where payment_id = v_plan.payment_id and status = 'confirmed';

  if not found then
    raise exception 'Confirmed client payment not found';
  end if;

  if nullif(trim(v_payment.buyer_email), '') is null
    or position('@' in trim(v_payment.buyer_email)) <= 1 then
    raise exception 'Client email is missing or invalid';
  end if;

  if nullif(trim(p_subject), '') is null then
    raise exception 'Email subject is required';
  end if;

  select *
  into v_delivery
  from public.client_strategy_plan_deliveries
  where plan_id = p_plan_id
  for update;

  if found then
    if v_delivery.status = 'sent' then
      raise exception 'This approved plan has already been sent';
    end if;
    if v_delivery.status = 'sending' then
      raise exception 'This delivery is already in progress; verify Brevo before retrying';
    end if;

    update public.client_strategy_plan_deliveries
    set
      status = 'sending',
      recipient_email = lower(trim(v_payment.buyer_email)),
      recipient_name = coalesce(nullif(trim(v_payment.buyer_name), ''), trim(v_payment.buyer_email)),
      subject = trim(p_subject),
      provider = null,
      provider_message_id = null,
      attempt_count = attempt_count + 1,
      error_code = null,
      delivered_at = null,
      updated_at = now()
    where id = v_delivery.id
    returning * into v_delivery;

    return v_delivery;
  end if;

  insert into public.client_strategy_plan_deliveries (
    plan_id,
    payment_id,
    recipient_email,
    recipient_name,
    subject
  ) values (
    v_plan.id,
    v_plan.payment_id,
    lower(trim(v_payment.buyer_email)),
    coalesce(nullif(trim(v_payment.buyer_name), ''), trim(v_payment.buyer_email)),
    trim(p_subject)
  )
  returning * into v_delivery;

  return v_delivery;
end;
$$;

create or replace function public.complete_client_strategy_plan_delivery(
  p_delivery_id uuid,
  p_provider_message_id text
)
returns public.client_strategy_plan_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery public.client_strategy_plan_deliveries%rowtype;
  v_plan public.client_strategy_plans%rowtype;
  v_delivered_at timestamptz := now();
begin
  select *
  into v_delivery
  from public.client_strategy_plan_deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'Strategy plan delivery not found';
  end if;

  if v_delivery.status = 'sent' then
    return v_delivery;
  end if;
  if v_delivery.status <> 'sending' then
    raise exception 'Only a reserved delivery can be completed';
  end if;
  if nullif(trim(p_provider_message_id), '') is null then
    raise exception 'Provider message ID is required';
  end if;

  select *
  into v_plan
  from public.client_strategy_plans
  where id = v_delivery.plan_id
  for update;

  if not found or v_plan.status <> 'approved' then
    raise exception 'Approved strategy plan not found';
  end if;

  update public.client_strategy_plan_deliveries
  set
    status = 'sent',
    provider = 'brevo',
    provider_message_id = trim(p_provider_message_id),
    delivered_at = v_delivered_at,
    error_code = null,
    updated_at = v_delivered_at
  where id = p_delivery_id
  returning * into v_delivery;

  update public.client_strategy_plans
  set status = 'sent'
  where id = v_delivery.plan_id;

  if v_plan.service_slug = 'career-clarity' then
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_7', 'Day 7 midpoint check-in', v_delivered_at + interval '7 days'),
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_14', 'Day 14 outcome review', v_delivered_at + interval '14 days')
    on conflict (plan_id, checkpoint_key) do nothing;
  else
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_7', 'Day 7 progress check-in', v_delivered_at + interval '7 days'),
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_14', 'Day 14 progress check-in', v_delivered_at + interval '14 days'),
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_21', 'Day 21 progress check-in', v_delivered_at + interval '21 days'),
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'day_30', 'Day 30 outcome review', v_delivered_at + interval '30 days')
    on conflict (plan_id, checkpoint_key) do nothing;
  end if;

  return v_delivery;
end;
$$;

create or replace function public.fail_client_strategy_plan_delivery(
  p_delivery_id uuid,
  p_error_code text
)
returns public.client_strategy_plan_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery public.client_strategy_plan_deliveries%rowtype;
begin
  update public.client_strategy_plan_deliveries
  set
    status = 'failed',
    error_code = left(coalesce(nullif(trim(p_error_code), ''), 'provider_error'), 80),
    updated_at = now()
  where id = p_delivery_id and status = 'sending'
  returning * into v_delivery;

  if not found then
    raise exception 'Reserved strategy plan delivery not found';
  end if;

  return v_delivery;
end;
$$;

create or replace function public.save_client_strategy_checkpoint_outcome(
  p_checkpoint_id uuid,
  p_status text,
  p_progress_status text,
  p_notes text,
  p_theme_keys text[]
)
returns public.client_strategy_checkpoints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkpoint public.client_strategy_checkpoints%rowtype;
begin
  select *
  into v_checkpoint
  from public.client_strategy_checkpoints
  where id = p_checkpoint_id
  for update;

  if not found then
    raise exception 'Strategy checkpoint not found';
  end if;
  if p_status not in ('completed', 'skipped') then
    raise exception 'Checkpoint outcome must be completed or skipped';
  end if;

  update public.client_strategy_checkpoints
  set
    status = p_status,
    progress_status = case when p_status = 'completed' then p_progress_status else null end,
    notes = left(coalesce(p_notes, ''), 4000),
    theme_keys = case when p_status = 'completed' then coalesce(p_theme_keys, '{}'::text[]) else '{}'::text[] end,
    completed_at = now(),
    updated_at = now()
  where id = p_checkpoint_id
  returning * into v_checkpoint;

  return v_checkpoint;
end;
$$;

alter table public.client_strategy_plan_deliveries enable row level security;
alter table public.client_strategy_checkpoints enable row level security;

revoke all privileges on table public.client_strategy_plan_deliveries from PUBLIC, anon, authenticated;
revoke all privileges on table public.client_strategy_checkpoints from PUBLIC, anon, authenticated;

grant select on table public.client_strategy_plan_deliveries to service_role;
grant select on table public.client_strategy_checkpoints to service_role;

revoke all on function public.reserve_client_strategy_plan_delivery(uuid, text)
  from PUBLIC, anon, authenticated;
revoke all on function public.complete_client_strategy_plan_delivery(uuid, text)
  from PUBLIC, anon, authenticated;
revoke all on function public.fail_client_strategy_plan_delivery(uuid, text)
  from PUBLIC, anon, authenticated;
revoke all on function public.save_client_strategy_checkpoint_outcome(uuid, text, text, text, text[])
  from PUBLIC, anon, authenticated;

grant execute on function public.reserve_client_strategy_plan_delivery(uuid, text)
  to service_role;
grant execute on function public.complete_client_strategy_plan_delivery(uuid, text)
  to service_role;
grant execute on function public.fail_client_strategy_plan_delivery(uuid, text)
  to service_role;
grant execute on function public.save_client_strategy_checkpoint_outcome(uuid, text, text, text, text[])
  to service_role;

comment on table public.client_strategy_plan_deliveries is
  'Private, idempotent delivery state for approved client strategy plans.';
comment on table public.client_strategy_checkpoints is
  'Private follow-up outcomes stored separately from immutable approved strategy plan content.';

select pg_notify('pgrst', 'reload schema');
