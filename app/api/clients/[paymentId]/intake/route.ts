import { NextResponse } from 'next/server';
import { getClientStrategyAccess } from '@/lib/client-strategy';
import {
  getClientLiveIntake,
} from '@/lib/client-intake-store';
import {
  normalizeClientIntakeValue,
  shouldPersistClientIntakeEdit,
  CONTEXT_VERIFICATION_KEY,
} from '@/lib/client-intake';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_FIELDS = 100;
const EDITED_BY = 'kagiso_dashboard';

function getRequestKey(request: Request, body?: Record<string, unknown> | null) {
  const url = new URL(request.url);
  return String(body?.key || request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '');
}

async function getEligibleClient(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const paymentResult = await supabase
    .from('payments')
    .select('payment_id, service_slug, status')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (!paymentResult.data || paymentResult.data.status !== 'confirmed') return null;

  const deliveryResult = await supabase
    .from('client_deliveries')
    .select('completed, completed_at')
    .eq('payment_id', paymentId);
  if (deliveryResult.error && !deliveryResult.error.message.includes('client_deliveries')) {
    throw new Error(deliveryResult.error.message);
  }

  const deliveryRows = (deliveryResult.data || []) as Array<{ completed: boolean; completed_at: string | null }>;
  const access = getClientStrategyAccess(
    {
      serviceSlug: String(paymentResult.data.service_slug),
      isDelivered: deliveryRows.length > 0 && deliveryRows.every((row) => Boolean(row.completed)),
      deliveredAt: deliveryRows.map((row) => row.completed_at).filter(Boolean).sort().at(-1) || null,
    },
    {},
  );
  if (!access.selectable) return null;

  return { paymentId: String(paymentResult.data.payment_id) };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const eligible = await getEligibleClient(paymentId);
    if (!eligible) return NextResponse.json({ error: 'Selectable confirmed client not found.' }, { status: 404 });
    return NextResponse.json({ intake: await getClientLiveIntake(paymentId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load client intake.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, body), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!isPlainRecord(body?.values)) {
    return NextResponse.json({ error: 'Intake values must be an object.' }, { status: 400 });
  }

  const entries = Object.entries(body.values);
  if (entries.length > MAX_FIELDS) {
    return NextResponse.json({ error: `Intake edits are limited to ${MAX_FIELDS} fields.` }, { status: 400 });
  }
  if (entries.some(([fieldName]) => !/^[a-zA-Z0-9_ -]{1,180}$/.test(fieldName))) {
    return NextResponse.json({ error: 'One or more intake field names are invalid.' }, { status: 400 });
  }

  try {
    const eligible = await getEligibleClient(paymentId);
    if (!eligible) return NextResponse.json({ error: 'Selectable confirmed client not found.' }, { status: 404 });

    const current = await getClientLiveIntake(paymentId);
    const edits = entries
      .map(([fieldName, value]) => [fieldName, normalizeClientIntakeValue(value)] as const)
      .filter(([fieldName, value]) => {
        const fieldExists = Object.prototype.hasOwnProperty.call(current.formData, fieldName);
        return shouldPersistClientIntakeEdit(current.formData[fieldName], value, fieldExists);
      });

    const changedNonControlField = edits.some(([fieldName]) => fieldName !== CONTEXT_VERIFICATION_KEY);
    if (changedNonControlField && current.contextVerified && !edits.some(([fieldName]) => fieldName === CONTEXT_VERIFICATION_KEY)) {
      edits.push([CONTEXT_VERIFICATION_KEY, false]);
    }

    if (edits.length > 0) {
      const editBatchId = crypto.randomUUID();
      const supabase = createSupabaseServiceClient();
      const { error } = await supabase.from('client_intake_overrides').insert(
        edits.map(([fieldName, value]) => ({
          payment_id: paymentId,
          field_name: fieldName,
          value,
          edited_at: new Date().toISOString(),
          edited_by: EDITED_BY,
          source: 'kagiso_override',
          edit_batch_id: editBatchId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ intake: await getClientLiveIntake(paymentId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save client intake edits.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
