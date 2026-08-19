import {
  mergeClientIntake,
  hasMeaningfulIntake,
  CONTEXT_VERIFICATION_KEY,
  type ClientIntakeOverride,
  type ClientLiveIntake,
} from '@/lib/client-intake';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type IntakeSubmissionRow = {
  id: string;
  payment_id: string;
  form_data: Record<string, unknown> | null;
  cv_file_url: string | null;
  submitted_at: string;
  source: string | null;
  source_reference: string | null;
  source_metadata: Record<string, unknown> | null;
};

type ClientIntakeOverrideRow = {
  id: string;
  payment_id: string;
  field_name: string;
  value: unknown;
  edited_at: string;
  edited_by: string;
  source: 'kagiso_override';
  edit_batch_id: string | null;
};

const INTAKE_SELECT = 'id, payment_id, form_data, cv_file_url, submitted_at, source, source_reference, source_metadata';
const OVERRIDE_SELECT = 'id, payment_id, field_name, value, edited_at, edited_by, source, edit_batch_id';

function normalizeOverride(row: ClientIntakeOverrideRow): ClientIntakeOverride {
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    fieldName: String(row.field_name),
    value: row.value as ClientIntakeOverride['value'],
    editedAt: String(row.edited_at),
    editedBy: String(row.edited_by),
    source: 'kagiso_override',
    editBatchId: row.edit_batch_id ? String(row.edit_batch_id) : null,
  };
}

function isMissingOverridesTable(message?: string) {
  return Boolean(message && (message.includes('client_intake_overrides') || message.includes('schema cache')));
}

/** Clears Kagiso's edits, leaving the original booking submission as the live intake again. */
export async function deleteClientIntakeOverrides(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('client_intake_overrides')
    .delete()
    .eq('payment_id', paymentId)
    .select('id');
  if (result.error && !isMissingOverridesTable(result.error.message)) throw new Error(result.error.message);
  return (result.data || []).length;
}

export async function getClientLiveIntake(paymentId: string): Promise<ClientLiveIntake> {
  const supabase = createSupabaseServiceClient();
  const [intakeResult, overrideResult] = await Promise.all([
    supabase
      .from('intake_submissions')
      .select(INTAKE_SELECT)
      .eq('payment_id', paymentId)
      .eq('duplicate_attempt', false)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('client_intake_overrides')
      .select(OVERRIDE_SELECT)
      .eq('payment_id', paymentId)
      .order('edited_at', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (intakeResult.error) throw new Error(intakeResult.error.message);
  if (overrideResult.error && !isMissingOverridesTable(overrideResult.error.message)) {
    throw new Error(overrideResult.error.message);
  }

  const intake = intakeResult.data as IntakeSubmissionRow | null;
  const overrides = overrideResult.error ? [] : ((overrideResult.data || []) as ClientIntakeOverrideRow[]).map(normalizeOverride);
  const originalFormData = (intake?.form_data || {}) as Record<string, unknown>;
  const { formData } = mergeClientIntake(originalFormData, overrides);
  const visibleOriginalFormData = { ...originalFormData };
  const visibleFormData = { ...formData };
  delete visibleOriginalFormData[CONTEXT_VERIFICATION_KEY];
  delete visibleFormData[CONTEXT_VERIFICATION_KEY];

  return {
    intakeId: intake?.id ? String(intake.id) : null,
    submittedAt: intake?.submitted_at ? String(intake.submitted_at) : null,
    source: intake?.source ? String(intake.source) : null,
    sourceReference: intake?.source_reference ? String(intake.source_reference) : null,
    sourceMetadata: (intake?.source_metadata || {}) as Record<string, unknown>,
    cvFileUrl: intake?.cv_file_url ? String(intake.cv_file_url) : null,
    originalFormData: visibleOriginalFormData,
    formData: visibleFormData,
    overrides,
    hasIntake: hasMeaningfulIntake(visibleFormData),
    contextVerified: formData[CONTEXT_VERIFICATION_KEY] === true,
  };
}
