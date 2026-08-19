import { getClientStrategyGenerationSource } from '@/lib/client-strategy-store';
import { evaluateClientSessionPreparationReadiness } from '@/lib/client-intake';
import { getIncludedClientDiagnosticContext } from '@/lib/client-diagnostic-context-store';
import {
  normalizeClientSessionPreparationContent,
  type ClientSessionPreparationContent,
  type ClientSessionPreparationRecord,
  type ClientSessionPreparationSourceSnapshot,
} from '@/lib/client-session-preparation';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type ClientSessionPreparationRow = {
  id: string;
  payment_id: string;
  service_slug: 'career-clarity' | 'glow-up-vip';
  version: number;
  content: unknown;
  edited_content?: unknown;
  source_snapshot: ClientSessionPreparationSourceSnapshot;
  generator_provider: string;
  generator_model: string;
  prompt_version: string;
  created_at: string;
  updated_at?: string;
};

const SESSION_PREPARATION_SELECT =
  'id, payment_id, service_slug, version, content, edited_content, source_snapshot, generator_provider, generator_model, prompt_version, created_at, updated_at';
const LEGACY_SESSION_PREPARATION_SELECT =
  'id, payment_id, service_slug, version, content, source_snapshot, generator_provider, generator_model, prompt_version, created_at';

function normalizeRow(row: ClientSessionPreparationRow): ClientSessionPreparationRecord {
  const generatedContent = normalizeClientSessionPreparationContent(row.content, { serviceSlug: row.service_slug });
  return {
    id: row.id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    version: Number(row.version),
    generatedContent,
    content: normalizeClientSessionPreparationContent(row.edited_content || row.content, { serviceSlug: row.service_slug }),
    sourceSnapshot: row.source_snapshot,
    generatorProvider: row.generator_provider,
    generatorModel: row.generator_model,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function isMissingSessionPreparationTable(message?: string) {
  return Boolean(message && (message.includes('client_session_preparations') || message.includes('schema cache')));
}

function isMissingSessionPreparationEditColumns(message?: string) {
  return Boolean(
    message &&
      (message.includes('edited_content') || message.includes('updated_at')) &&
      (message.includes('column') || message.includes('schema cache')),
  );
}

export const SESSION_PREPARATION_EDIT_STORAGE_NOT_READY =
  'SESSION_PREPARATION_EDIT_STORAGE_NOT_READY';

export async function getClientSessionPreparationSource(paymentId: string) {
  const source = await getClientStrategyGenerationSource(paymentId);
  if (!source) return null;
  const diagnosticContext = await getIncludedClientDiagnosticContext(paymentId);
  const readiness = evaluateClientSessionPreparationReadiness({
    formData: source.intake?.formData || {},
    contextVerified: Boolean(source.intake?.contextVerified),
    hasCvAnalysis: Boolean(source.cvAnalysis?.report),
  });
  return {
    ...source,
    ...readiness,
    diagnosticContext,
  };
}

export async function getLatestClientSessionPreparation(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  let result = await supabase
    .from('client_session_preparations')
    .select(SESSION_PREPARATION_SELECT)
    .eq('payment_id', paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error && isMissingSessionPreparationEditColumns(result.error.message)) {
    result = await supabase
      .from('client_session_preparations')
      .select(LEGACY_SESSION_PREPARATION_SELECT)
      .eq('payment_id', paymentId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  if (result.error) {
    if (isMissingSessionPreparationTable(result.error.message)) return null;
    throw new Error(result.error.message);
  }
  return result.data ? normalizeRow(result.data as ClientSessionPreparationRow) : null;
}

export async function getClientSessionPreparation(paymentId: string, preparationId: string) {
  const supabase = createSupabaseServiceClient();
  let result = await supabase
    .from('client_session_preparations')
    .select(SESSION_PREPARATION_SELECT)
    .eq('payment_id', paymentId)
    .eq('id', preparationId)
    .maybeSingle();

  if (result.error && isMissingSessionPreparationEditColumns(result.error.message)) {
    result = await supabase
      .from('client_session_preparations')
      .select(LEGACY_SESSION_PREPARATION_SELECT)
      .eq('payment_id', paymentId)
      .eq('id', preparationId)
      .maybeSingle();
  }

  if (result.error) {
    if (isMissingSessionPreparationTable(result.error.message)) return null;
    throw new Error(result.error.message);
  }
  return result.data ? normalizeRow(result.data as ClientSessionPreparationRow) : null;
}

/** Session prep is coach-only working material, never sent to the client, so a full reset can clear it outright. */
export async function deleteAllClientSessionPreparations(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('client_session_preparations')
    .delete()
    .eq('payment_id', paymentId)
    .select('id');
  if (result.error) {
    if (isMissingSessionPreparationTable(result.error.message)) return 0;
    throw new Error(result.error.message);
  }
  return (result.data || []).length;
}

export async function saveClientSessionPreparation(input: {
  paymentId: string;
  serviceSlug: 'career-clarity' | 'glow-up-vip';
  content: ClientSessionPreparationContent;
  sourceSnapshot: ClientSessionPreparationSourceSnapshot;
  generatorProvider: string;
  generatorModel: string;
  promptVersion: string;
}) {
  const supabase = createSupabaseServiceClient();
  const latestResult = await supabase
    .from('client_session_preparations')
    .select('version')
    .eq('payment_id', input.paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestResult.error && !isMissingSessionPreparationTable(latestResult.error.message)) {
    throw new Error(latestResult.error.message);
  }

  const result = await supabase
    .from('client_session_preparations')
    .insert({
      payment_id: input.paymentId,
      service_slug: input.serviceSlug,
      version: Number(latestResult.data?.version || 0) + 1,
      content: input.content,
      edited_content: input.content,
      source_snapshot: input.sourceSnapshot,
      generator_provider: input.generatorProvider,
      generator_model: input.generatorModel,
      prompt_version: input.promptVersion,
    })
    .select(SESSION_PREPARATION_SELECT)
    .single();
  if (result.error) {
    if (isMissingSessionPreparationEditColumns(result.error.message)) {
      throw new Error(SESSION_PREPARATION_EDIT_STORAGE_NOT_READY);
    }
    throw new Error(result.error.message);
  }
  return normalizeRow(result.data as ClientSessionPreparationRow);
}

export async function updateLatestClientSessionPreparation(input: {
  paymentId: string;
  preparationId: string;
  editedContent: ClientSessionPreparationContent;
}) {
  const supabase = createSupabaseServiceClient();
  const latestResult = await supabase
    .from('client_session_preparations')
    .select('id')
    .eq('payment_id', input.paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestResult.error) throw new Error(latestResult.error.message);
  if (!latestResult.data || latestResult.data.id !== input.preparationId) return null;

  const result = await supabase
    .from('client_session_preparations')
    .update({ edited_content: input.editedContent })
    .eq('id', input.preparationId)
    .eq('payment_id', input.paymentId)
    .select(SESSION_PREPARATION_SELECT)
    .maybeSingle();

  if (result.error) {
    if (isMissingSessionPreparationEditColumns(result.error.message)) {
      throw new Error(SESSION_PREPARATION_EDIT_STORAGE_NOT_READY);
    }
    throw new Error(result.error.message);
  }
  return result.data ? normalizeRow(result.data as ClientSessionPreparationRow) : null;
}
