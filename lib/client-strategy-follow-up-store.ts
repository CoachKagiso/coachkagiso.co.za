import type { ClientStrategyServiceSlug } from '@/lib/client-strategy';
import {
  aggregateClientStrategyThemes,
  type ClientStrategyCheckpointOutcome,
  type ClientStrategyCheckpointStatus,
  type ClientStrategyProgressStatus,
  type ClientStrategyThemeKey,
} from '@/lib/client-strategy-follow-up';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type ClientStrategyPlanDelivery = {
  id: string;
  planId: string;
  paymentId: string;
  status: 'sending' | 'sent' | 'failed';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  errorCode: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientStrategyCheckpoint = {
  id: string;
  planId: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  key: string;
  label: string;
  dueAt: string;
  status: ClientStrategyCheckpointStatus;
  progressStatus: ClientStrategyProgressStatus | null;
  notes: string;
  themes: ClientStrategyThemeKey[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeliveryRow = {
  id: string;
  plan_id: string;
  payment_id: string;
  status: ClientStrategyPlanDelivery['status'];
  recipient_email: string;
  recipient_name: string;
  subject: string;
  provider: string | null;
  provider_message_id: string | null;
  attempt_count: number;
  error_code: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

type CheckpointRow = {
  id: string;
  plan_id: string;
  payment_id: string;
  service_slug: ClientStrategyServiceSlug;
  checkpoint_key: string;
  label: string;
  due_at: string;
  status: ClientStrategyCheckpointStatus;
  progress_status: ClientStrategyProgressStatus | null;
  notes: string;
  theme_keys: ClientStrategyThemeKey[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const DELIVERY_SELECT =
  'id, plan_id, payment_id, status, recipient_email, recipient_name, subject, provider, provider_message_id, attempt_count, error_code, delivered_at, created_at, updated_at';
const CHECKPOINT_SELECT =
  'id, plan_id, payment_id, service_slug, checkpoint_key, label, due_at, status, progress_status, notes, theme_keys, completed_at, created_at, updated_at';

function normalizeDelivery(row: DeliveryRow): ClientStrategyPlanDelivery {
  return {
    id: row.id,
    planId: row.plan_id,
    paymentId: row.payment_id,
    status: row.status,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    attemptCount: Number(row.attempt_count),
    errorCode: row.error_code,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCheckpoint(row: CheckpointRow): ClientStrategyCheckpoint {
  return {
    id: row.id,
    planId: row.plan_id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    key: row.checkpoint_key,
    label: row.label,
    dueAt: row.due_at,
    status: row.status,
    progressStatus: row.progress_status,
    notes: row.notes || '',
    themes: row.theme_keys || [],
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getClientStrategyFollowUpState(paymentId: string, planId: string) {
  const supabase = createSupabaseServiceClient();
  const [paymentResult, deliveryResult, checkpointsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_id, buyer_email, buyer_name')
      .eq('payment_id', paymentId)
      .maybeSingle(),
    supabase
      .from('client_strategy_plan_deliveries')
      .select(DELIVERY_SELECT)
      .eq('payment_id', paymentId)
      .eq('plan_id', planId)
      .maybeSingle(),
    supabase
      .from('client_strategy_checkpoints')
      .select(CHECKPOINT_SELECT)
      .eq('payment_id', paymentId)
      .eq('plan_id', planId)
      .order('due_at', { ascending: true }),
  ]);

  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (deliveryResult.error) throw new Error(deliveryResult.error.message);
  if (checkpointsResult.error) throw new Error(checkpointsResult.error.message);

  return {
    recipient: paymentResult.data
      ? {
          email: String(paymentResult.data.buyer_email || ''),
          name: String(paymentResult.data.buyer_name || paymentResult.data.buyer_email || 'Client'),
        }
      : null,
    delivery: deliveryResult.data ? normalizeDelivery(deliveryResult.data as DeliveryRow) : null,
    checkpoints: ((checkpointsResult.data || []) as CheckpointRow[]).map(normalizeCheckpoint),
  };
}

export async function getClientStrategyThemeReport() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_checkpoints')
    .select('payment_id, theme_keys')
    .eq('status', 'completed');

  if (error) throw new Error(error.message);
  const checkpointRows = (data || []) as Array<{ payment_id: string; theme_keys: string[] }>;
  const paymentIds = [...new Set(checkpointRows.map((row) => row.payment_id))];
  if (paymentIds.length === 0) return aggregateClientStrategyThemes([]);

  const paymentResult = await supabase
    .from('payments')
    .select('payment_id, is_test')
    .in('payment_id', paymentIds);
  const isMissingTestColumn = paymentResult.error?.message.includes('is_test');
  if (paymentResult.error && !isMissingTestColumn) throw new Error(paymentResult.error.message);
  const livePaymentIds = isMissingTestColumn
    ? new Set(paymentIds)
    : new Set((paymentResult.data || []).filter((payment) => !payment.is_test).map((payment) => String(payment.payment_id)));

  return aggregateClientStrategyThemes(
    checkpointRows
      .filter((row) => livePaymentIds.has(row.payment_id))
      .map((row) => ({
        paymentId: row.payment_id,
        themes: row.theme_keys || [],
      })),
  );
}

export async function reserveClientStrategyPlanDelivery(planId: string, subject: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('reserve_client_strategy_plan_delivery', {
      p_plan_id: planId,
      p_subject: subject,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizeDelivery(data as DeliveryRow);
}

export async function completeClientStrategyPlanDelivery(deliveryId: string, providerMessageId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('complete_client_strategy_plan_delivery', {
      p_delivery_id: deliveryId,
      p_provider_message_id: providerMessageId,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizeDelivery(data as DeliveryRow);
}

export async function failClientStrategyPlanDelivery(deliveryId: string, errorCode: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('fail_client_strategy_plan_delivery', {
      p_delivery_id: deliveryId,
      p_error_code: errorCode,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizeDelivery(data as DeliveryRow);
}

export async function saveClientStrategyCheckpointOutcome(
  checkpointId: string,
  outcome: ClientStrategyCheckpointOutcome,
) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('save_client_strategy_checkpoint_outcome', {
      p_checkpoint_id: checkpointId,
      p_status: outcome.status,
      p_progress_status: outcome.progressStatus,
      p_notes: outcome.notes,
      p_theme_keys: outcome.themes,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizeCheckpoint(data as CheckpointRow);
}
