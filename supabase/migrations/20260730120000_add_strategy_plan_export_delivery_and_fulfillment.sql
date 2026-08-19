create table if not exists public.client_strategy_fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id) on delete cascade,
  service_slug text not null check (service_slug in ('career-clarity', 'glow-up-vip')),
  item_key text not null,
  label text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  completion_source text not null default 'manual' check (completion_source in ('manual', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_id, item_key)
);

create index if not exists client_strategy_fulfillment_payment_idx
  on public.client_strategy_fulfillment_items(payment_id, created_at);

grant select, insert, update on public.client_strategy_fulfillment_items to service_role;

create or replace function public.delete_client_strategy_plan_draft(
  p_plan_id uuid,
  p_payment_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.client_strategy_plans%rowtype;
begin
  select * into v_plan
  from public.client_strategy_plans
  where id = p_plan_id and payment_id = p_payment_id
  for update;

  if not found then raise exception 'Strategy plan not found'; end if;
  if not (
    v_plan.status = 'draft'
    or (v_plan.status = 'superseded' and v_plan.approved_at is null)
  ) then
    raise exception 'Approved, sent, or previously approved plan history cannot be deleted';
  end if;
  if exists (select 1 from public.client_strategy_plan_deliveries where plan_id = v_plan.id)
    or exists (select 1 from public.client_strategy_checkpoints where plan_id = v_plan.id) then
    raise exception 'Plan versions with delivery or follow-up history cannot be deleted';
  end if;

  delete from public.client_strategy_plans where id = v_plan.id;
  return v_plan.id;
end;
$$;

create or replace function public.reset_client_strategy_plan_drafts(
  p_workspace_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.client_strategy_plans plans
  where plans.workspace_id = p_workspace_id
    and (
      plans.status = 'draft'
      or (plans.status = 'superseded' and plans.approved_at is null)
    )
    and not exists (select 1 from public.client_strategy_plan_deliveries deliveries where deliveries.plan_id = plans.id)
    and not exists (select 1 from public.client_strategy_checkpoints checkpoints where checkpoints.plan_id = plans.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.record_manual_client_strategy_plan_delivery(
  p_plan_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_subject text,
  p_delivered_at timestamptz default now()
)
returns public.client_strategy_plan_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.client_strategy_plans%rowtype;
  v_delivery public.client_strategy_plan_deliveries%rowtype;
  v_delivered_at timestamptz := coalesce(p_delivered_at, now());
begin
  select * into v_plan
  from public.client_strategy_plans
  where id = p_plan_id
  for update;
  if not found or v_plan.status <> 'approved' then
    raise exception 'Only an approved plan can be recorded as manually delivered';
  end if;
  if nullif(trim(p_recipient_email), '') is null then raise exception 'Recipient email is required'; end if;

  insert into public.client_strategy_plan_deliveries (
    plan_id, payment_id, status, recipient_email, recipient_name, subject,
    provider, provider_message_id, attempt_count, delivered_at
  ) values (
    v_plan.id, v_plan.payment_id, 'sent', lower(trim(p_recipient_email)),
    left(coalesce(nullif(trim(p_recipient_name), ''), 'Client'), 160),
    left(coalesce(nullif(trim(p_subject), ''), 'Your career development plan'), 200),
    'manual_email', 'manual:' || gen_random_uuid()::text, 1, v_delivered_at
  )
  on conflict (plan_id) do update set
    status = 'sent',
    recipient_email = excluded.recipient_email,
    recipient_name = excluded.recipient_name,
    subject = excluded.subject,
    provider = excluded.provider,
    provider_message_id = excluded.provider_message_id,
    delivered_at = excluded.delivered_at,
    error_code = null,
    updated_at = now()
  where public.client_strategy_plan_deliveries.status <> 'sent'
  returning * into v_delivery;

  if v_delivery.id is null then
    select * into v_delivery from public.client_strategy_plan_deliveries where plan_id = v_plan.id;
  end if;

  update public.client_strategy_plans set status = 'sent' where id = v_plan.id;

  if v_plan.service_slug = 'career-clarity' then
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values (
      v_plan.id, v_plan.payment_id, v_plan.service_slug, 'teams_day_14',
      '15-minute Microsoft Teams follow-up', v_delivered_at + interval '14 days'
    ) on conflict (plan_id, checkpoint_key) do nothing;
  else
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'whatsapp_day_10_14', 'WhatsApp check-in', v_delivered_at + interval '12 days'),
      (v_plan.id, v_plan.payment_id, v_plan.service_slug, 'teams_day_28_30', '15-minute Microsoft Teams follow-up', v_delivered_at + interval '29 days')
    on conflict (plan_id, checkpoint_key) do nothing;
  end if;
  return v_delivery;
end;
$$;

revoke all on function public.delete_client_strategy_plan_draft(uuid, text) from public, anon, authenticated;
revoke all on function public.reset_client_strategy_plan_drafts(uuid) from public, anon, authenticated;
revoke all on function public.record_manual_client_strategy_plan_delivery(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.delete_client_strategy_plan_draft(uuid, text) to service_role;
grant execute on function public.reset_client_strategy_plan_drafts(uuid) to service_role;
grant execute on function public.record_manual_client_strategy_plan_delivery(uuid, text, text, text, timestamptz) to service_role;
