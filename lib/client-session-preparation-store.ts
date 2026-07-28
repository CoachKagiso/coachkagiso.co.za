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
  source_snapshot: ClientSessionPreparationSourceSnapshot;
  generator_provider: string;
  generator_model: string;
  prompt_version: string;
  created_at: string;
};

const SESSION_PREPARATION_SELECT =
  'id, payment_id, service_slug, version, content, source_snapshot, generator_provider, generator_model, prompt_version, created_at';

function normalizeRow(row: ClientSessionPreparationRow): ClientSessionPreparationRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    version: Number(row.version),
    content: normalizeClientSessionPreparationContent(row.content),
    sourceSnapshot: row.source_snapshot,
    generatorProvider: row.generator_provider,
    generatorModel: row.generator_model,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
  };
}

function isMissingSessionPreparationTable(message?: string) {
  return Boolean(message && (message.includes('client_session_preparations') || message.includes('schema cache')));
}

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
  const result = await supabase
    .from('client_session_preparations')
    .select(SESSION_PREPARATION_SELECT)
    .eq('payment_id', paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    if (isMissingSessionPreparationTable(result.error.message)) return null;
    throw new Error(result.error.message);
  }
  return result.data ? normalizeRow(result.data as ClientSessionPreparationRow) : null;
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
      source_snapshot: input.sourceSnapshot,
      generator_provider: input.generatorProvider,
      generator_model: input.generatorModel,
      prompt_version: input.promptVersion,
    })
    .select(SESSION_PREPARATION_SELECT)
    .single();
  if (result.error) throw new Error(result.error.message);
  return normalizeRow(result.data as ClientSessionPreparationRow);
}
