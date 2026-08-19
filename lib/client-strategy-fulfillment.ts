import type { ClientStrategyServiceSlug } from '@/lib/client-strategy';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type ClientStrategyFulfillmentItem = {
  id: string;
  key: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  completionSource: 'manual' | 'system';
};

const DEFINITIONS: Record<ClientStrategyServiceSlug, Array<{ key: string; label: string }>> = {
  'career-clarity': [
    { key: 'session_completed', label: 'Session completed' },
    { key: 'session_summary_finalised', label: 'Session summary finalised' },
    { key: 'development_plan_finalised', label: 'Career development plan finalised' },
    { key: 'client_pack_exported', label: 'Client pack exported' },
    { key: 'client_pack_emailed', label: 'Client pack emailed' },
    { key: 'teams_follow_up_booked', label: 'Microsoft Teams follow-up booked' },
    { key: 'teams_follow_up_completed', label: 'Microsoft Teams follow-up completed' },
  ],
  'glow-up-vip': [
    { key: 'session_completed', label: 'VIP session completed' },
    { key: 'cv_revamp_completed', label: 'CV revamp completed' },
    { key: 'linkedin_optimisation_completed', label: 'LinkedIn optimisation completed' },
    { key: 'session_summary_finalised', label: 'Session summary finalised' },
    { key: 'development_plan_finalised', label: 'Career development plan finalised' },
    { key: 'interview_preparation_finalised', label: 'Interview preparation finalised' },
    { key: 'client_pack_exported', label: 'Client pack exported' },
    { key: 'client_pack_emailed', label: 'Client pack emailed' },
    { key: 'whatsapp_follow_up_completed', label: 'WhatsApp follow-up completed' },
    { key: 'teams_follow_up_booked', label: 'Microsoft Teams follow-up booked' },
    { key: 'teams_follow_up_completed', label: 'Microsoft Teams follow-up completed' },
  ],
};

type FulfillmentRow = {
  id: string;
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  completion_source: 'manual' | 'system';
};

function normalize(row: FulfillmentRow): ClientStrategyFulfillmentItem {
  return {
    id: row.id,
    key: row.item_key,
    label: row.label,
    completed: row.completed,
    completedAt: row.completed_at,
    completionSource: row.completion_source,
  };
}

export async function getClientStrategyFulfillment(paymentId: string, serviceSlug: ClientStrategyServiceSlug) {
  const supabase = createSupabaseServiceClient();
  const definitions = DEFINITIONS[serviceSlug];
  const { error: upsertError } = await supabase
    .from('client_strategy_fulfillment_items')
    .upsert(
      definitions.map((item) => ({
        payment_id: paymentId,
        service_slug: serviceSlug,
        item_key: item.key,
        label: item.label,
      })),
      { onConflict: 'payment_id,item_key', ignoreDuplicates: true },
    );
  if (upsertError) throw new Error(upsertError.message);
  const { data, error } = await supabase
    .from('client_strategy_fulfillment_items')
    .select('id, item_key, label, completed, completed_at, completion_source')
    .eq('payment_id', paymentId);
  if (error) throw new Error(error.message);
  const rows = (data || []) as FulfillmentRow[];
  return definitions.map((definition) => normalize(
    rows.find((row) => row.item_key === definition.key)
      || {
        id: '',
        item_key: definition.key,
        label: definition.label,
        completed: false,
        completed_at: null,
        completion_source: 'manual',
      },
  ));
}

export async function setClientStrategyFulfillmentItem(input: {
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  key: string;
  completed: boolean;
  source: 'manual' | 'system';
}) {
  const definition = DEFINITIONS[input.serviceSlug].find((item) => item.key === input.key);
  if (!definition) throw new Error('Unknown fulfillment checklist item.');
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_fulfillment_items')
    .upsert({
      payment_id: input.paymentId,
      service_slug: input.serviceSlug,
      item_key: definition.key,
      label: definition.label,
      completed: input.completed,
      completed_at: input.completed ? new Date().toISOString() : null,
      completion_source: input.source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'payment_id,item_key' })
    .select('id, item_key, label, completed, completed_at, completion_source')
    .single();
  if (error) throw new Error(error.message);
  return normalize(data as FulfillmentRow);
}

export async function completeClientStrategyFulfillmentItems(
  paymentId: string,
  serviceSlug: ClientStrategyServiceSlug,
  keys: string[],
) {
  await Promise.all(keys.map((key) => setClientStrategyFulfillmentItem({
    paymentId,
    serviceSlug,
    key,
    completed: true,
    source: 'system',
  })));
}
