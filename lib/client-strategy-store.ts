import {
  normalizeSessionDebrief,
  isClientStrategyServiceSlug,
  type ClientStrategyServiceSlug,
  type ClientStrategyWorkspaceRecord,
  type SessionDebrief,
} from '@/lib/client-strategy';
import {
  normalizeClientStrategyPlanContent,
  type ClientStrategyPlanContent,
  type ClientStrategyPlanRecord,
  type ClientStrategyPlanSourceSnapshot,
  type ClientStrategyPlanStatus,
} from '@/lib/client-strategy-plan';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type ClientStrategyWorkspaceRow = {
  id: string;
  payment_id: string;
  service_slug: ClientStrategyServiceSlug;
  status: 'draft';
  debrief: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
};

const WORKSPACE_SELECT =
  'id, payment_id, service_slug, status, debrief, version, created_at, updated_at';

type ClientStrategyPlanRow = {
  id: string;
  workspace_id: string;
  payment_id: string;
  service_slug: ClientStrategyServiceSlug;
  duration_days: 14 | 30;
  version: number;
  status: ClientStrategyPlanStatus;
  generated_content: unknown;
  edited_content: unknown;
  source_snapshot: ClientStrategyPlanSourceSnapshot;
  generator_provider: string;
  generator_model: string;
  prompt_version: string;
  generated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

const PLAN_SELECT =
  'id, workspace_id, payment_id, service_slug, duration_days, version, status, generated_content, edited_content, source_snapshot, generator_provider, generator_model, prompt_version, generated_at, approved_by, approved_at, created_at, updated_at';

function normalizeWorkspaceRow(row: ClientStrategyWorkspaceRow): ClientStrategyWorkspaceRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    status: row.status,
    debrief: normalizeSessionDebrief(row.debrief),
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePlanRow(row: ClientStrategyPlanRow): ClientStrategyPlanRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    durationDays: Number(row.duration_days) as 14 | 30,
    version: Number(row.version),
    status: row.status,
    generatedContent: normalizeClientStrategyPlanContent(row.service_slug, row.generated_content),
    editedContent: normalizeClientStrategyPlanContent(row.service_slug, row.edited_content),
    sourceSnapshot: row.source_snapshot,
    generatorProvider: row.generator_provider,
    generatorModel: row.generator_model,
    promptVersion: row.prompt_version,
    generatedAt: row.generated_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getClientStrategyWorkspace(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_workspaces')
    .select(WORKSPACE_SELECT)
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeWorkspaceRow(data as ClientStrategyWorkspaceRow) : null;
}

export async function saveClientStrategyWorkspace(input: {
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  debrief: SessionDebrief;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_workspaces')
    .upsert(
      {
        payment_id: input.paymentId,
        service_slug: input.serviceSlug,
        status: 'draft',
        debrief: input.debrief,
        last_changed_by: 'dashboard_admin',
      },
      { onConflict: 'payment_id' },
    )
    .select(WORKSPACE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalizeWorkspaceRow(data as ClientStrategyWorkspaceRow);
}

export async function getClientStrategyGenerationSource(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const [paymentResult, workspaceResult, intakeResult] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_id, service_slug, status')
      .eq('payment_id', paymentId)
      .maybeSingle(),
    supabase
      .from('client_strategy_workspaces')
      .select(WORKSPACE_SELECT)
      .eq('payment_id', paymentId)
      .maybeSingle(),
    supabase
      .from('intake_submissions')
      .select('id, form_data, cv_file_url, submitted_at')
      .eq('payment_id', paymentId)
      .eq('duplicate_attempt', false)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (workspaceResult.error) throw new Error(workspaceResult.error.message);
  if (intakeResult.error) throw new Error(intakeResult.error.message);

  const payment = paymentResult.data;
  if (!payment || payment.status !== 'confirmed' || !isClientStrategyServiceSlug(payment.service_slug)) {
    return null;
  }

  return {
    paymentId: String(payment.payment_id),
    serviceSlug: payment.service_slug,
    workspace: workspaceResult.data
      ? normalizeWorkspaceRow(workspaceResult.data as ClientStrategyWorkspaceRow)
      : null,
    intake: intakeResult.data
      ? {
          id: String(intakeResult.data.id),
          formData: (intakeResult.data.form_data || {}) as Record<string, unknown>,
          cvFileUrl: intakeResult.data.cv_file_url ? String(intakeResult.data.cv_file_url) : null,
          submittedAt: String(intakeResult.data.submitted_at),
        }
      : null,
  };
}

export async function getClientStrategyPlans(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_plans')
    .select(PLAN_SELECT)
    .eq('payment_id', paymentId)
    .order('version', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ClientStrategyPlanRow[]).map(normalizePlanRow);
}

export async function getClientStrategyPlan(paymentId: string, planId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_plans')
    .select(PLAN_SELECT)
    .eq('payment_id', paymentId)
    .eq('id', planId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizePlanRow(data as ClientStrategyPlanRow) : null;
}

export async function createClientStrategyPlan(input: {
  workspaceId: string;
  generatedContent: ClientStrategyPlanContent;
  sourceSnapshot: ClientStrategyPlanSourceSnapshot;
  generatorProvider: string;
  generatorModel: string;
  promptVersion: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .rpc('create_client_strategy_plan', {
      p_workspace_id: input.workspaceId,
      p_generated_content: input.generatedContent,
      p_source_snapshot: input.sourceSnapshot,
      p_generator_provider: input.generatorProvider,
      p_generator_model: input.generatorModel,
      p_prompt_version: input.promptVersion,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizePlanRow(data as ClientStrategyPlanRow);
}

export async function updateClientStrategyPlanDraft(input: {
  paymentId: string;
  planId: string;
  editedContent: ClientStrategyPlanContent;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('client_strategy_plans')
    .update({ edited_content: input.editedContent })
    .eq('id', input.planId)
    .eq('payment_id', input.paymentId)
    .eq('status', 'draft')
    .select(PLAN_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizePlanRow(data as ClientStrategyPlanRow) : null;
}

export async function approveClientStrategyPlan(input: {
  paymentId: string;
  planId: string;
  approvedBy: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from('client_strategy_plans')
    .select('id')
    .eq('id', input.planId)
    .eq('payment_id', input.paymentId)
    .eq('status', 'draft')
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) return null;

  const { data, error } = await supabase
    .rpc('approve_client_strategy_plan', {
      p_plan_id: input.planId,
      p_approved_by: input.approvedBy,
    })
    .single();

  if (error) throw new Error(error.message);
  return normalizePlanRow(data as ClientStrategyPlanRow);
}
