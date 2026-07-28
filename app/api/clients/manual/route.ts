import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getAsyncService } from '@/lib/buying-flow';
import { validatePrivateCvUpload } from '@/lib/cv-upload-validation';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  getManualClientIntakeFields,
  manualClientRequiresCv,
  normalizeManualClientEngagement,
} from '@/lib/manual-client-engagement';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_MANUAL_REQUEST_BYTES = 12 * 1024 * 1024;
const DUPLICATE_LOOKBACK_DAYS = 7;

function isTruthy(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'yes' || value === 'on';
}

async function findPossibleDuplicate(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  input: { email: string; serviceSlug: string; paymentReference: string },
) {
  const since = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const recentByEmail = supabase
    .from('payments')
    .select('payment_id, confirmed_at')
    .eq('buyer_email', input.email)
    .eq('service_slug', input.serviceSlug)
    .eq('status', 'confirmed')
    .gte('confirmed_at', since)
    .order('confirmed_at', { ascending: false })
    .limit(1);
  const byReference = input.paymentReference
    ? supabase
        .from('payments')
        .select('payment_id, confirmed_at')
        .eq('payment_provider', 'manual')
        .eq('manual_payment_reference', input.paymentReference)
        .order('confirmed_at', { ascending: false })
        .limit(1)
    : Promise.resolve({ data: [], error: null });

  const [emailResult, referenceResult] = await Promise.all([recentByEmail, byReference]);
  if (emailResult.error || referenceResult.error) throw new Error('DUPLICATE_CHECK_FAILED');
  return emailResult.data?.[0] || referenceResult.data?.[0] || null;
}

export async function POST(request: Request) {
  const key = request.headers.get('x-diagnostic-admin-key') || '';
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_MANUAL_REQUEST_BYTES) {
    return NextResponse.json({ error: 'The manual client submission is too large.' }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'The manual client form could not be read.' }, { status: 400 });
  }

  const service = getAsyncService(String(formData.get('service_slug') || '').trim());
  if (!service) return NextResponse.json({ error: 'Choose a valid service.' }, { status: 400 });

  const intake = getManualClientIntakeFields(service).reduce<Record<string, string>>((result, field) => {
    result[field.name] = String(formData.get(`intake_${field.name}`) || '');
    return result;
  }, {});

  let engagement;
  try {
    engagement = normalizeManualClientEngagement({
      fullName: formData.get('full_name'),
      email: formData.get('email'),
      whatsapp: formData.get('whatsapp'),
      serviceSlug: service.slug,
      paymentMethod: formData.get('payment_method'),
      amount: formData.get('amount'),
      paidAt: formData.get('paid_at'),
      paymentReference: formData.get('payment_reference'),
      paymentNotes: formData.get('payment_notes'),
      sessionDate: formData.get('session_date'),
      isTest: formData.get('is_test'),
      paymentVerified: formData.get('payment_verified'),
      intake,
    }, service);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check the manual client details.' },
      { status: 422 },
    );
  }

  const file = formData.get('cv_file');
  const hasCv = file instanceof File && file.size > 0;
  if (manualClientRequiresCv(service) && !hasCv) {
    return NextResponse.json({ error: 'Upload the client CV before creating this engagement.' }, { status: 422 });
  }

  const supabase = createSupabaseServiceClient();
  if (!isTruthy(formData.get('confirm_duplicate'))) {
    try {
      const duplicate = await findPossibleDuplicate(supabase, engagement);
      if (duplicate) {
        return NextResponse.json({
          error: 'A recent engagement may already exist for this client and service.',
          code: 'possible_duplicate',
          existingPaymentId: duplicate.payment_id,
          existingConfirmedAt: duplicate.confirmed_at,
        }, { status: 409 });
      }
    } catch {
      return NextResponse.json({ error: 'Could not safely check for a duplicate engagement.' }, { status: 500 });
    }
  }

  const paymentId = `manual-${service.slug}-${randomUUID()}`;
  const recordedAt = new Date().toISOString();
  let cvFileUrl: string | null = null;
  let uploadedPath: string | null = null;

  if (hasCv) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let validatedFile;
    try {
      validatedFile = validatePrivateCvUpload({
        name: file.name,
        type: file.type,
        size: file.size,
        bytes,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'The CV could not be validated.' },
        { status: 422 },
      );
    }

    uploadedPath = `${engagement.isTest ? 'test-clients' : 'manual-clients'}/${service.folder}/${paymentId}/${validatedFile.filename}`;
    const upload = await supabase.storage.from('client-uploads').upload(uploadedPath, bytes, {
      contentType: validatedFile.contentType,
      upsert: false,
    });
    if (upload.error) {
      console.error('Manual client CV upload failed.');
      return NextResponse.json({ error: 'Could not store the client CV.' }, { status: 500 });
    }

    const signed = await supabase.storage.from('client-uploads').createSignedUrl(uploadedPath, 7 * 24 * 60 * 60);
    if (signed.error || !signed.data?.signedUrl) {
      await supabase.storage.from('client-uploads').remove([uploadedPath]);
      return NextResponse.json({ error: 'Could not secure the client CV link.' }, { status: 500 });
    }
    cvFileUrl = signed.data.signedUrl;
  }

  const paymentInsert = await supabase.from('payments').insert({
    payment_id: paymentId,
    service_slug: engagement.serviceSlug,
    amount: engagement.amount,
    status: 'confirmed',
    buyer_email: engagement.email,
    buyer_name: engagement.fullName,
    confirmed_at: engagement.paidAt,
    intake_submitted_at: recordedAt,
    payment_provider: 'manual',
    provider_status: 'confirmed',
    manual_payment_method: engagement.paymentMethod,
    manual_payment_reference: engagement.paymentReference || null,
    manual_payment_notes: engagement.paymentNotes || null,
    confirmed_by: 'dashboard-admin',
    is_test: engagement.isTest,
  });

  if (paymentInsert.error) {
    if (uploadedPath) await supabase.storage.from('client-uploads').remove([uploadedPath]);
    console.error('Manual client payment insert failed.');
    return NextResponse.json({ error: 'Could not create the manual client engagement.' }, { status: 500 });
  }

  const intakeInsert = await supabase.from('intake_submissions').insert({
    payment_id: paymentId,
    service_slug: engagement.serviceSlug,
    form_data: {
      fullName: engagement.fullName,
      email: engagement.email,
      ...(engagement.whatsapp ? { whatsapp: engagement.whatsapp } : {}),
      ...engagement.intake,
      briefAcknowledgement: true,
      briefAcknowledgedAt: recordedAt,
      cvDeliveryMethod: cvFileUrl ? 'uploaded' : 'not_required',
    },
    cv_file_url: cvFileUrl,
    source: 'manual_dashboard',
    source_reference: paymentId,
    source_metadata: {
      entryVersion: 1,
      recordedAt,
      recordedBy: 'dashboard-admin',
      sessionDate: engagement.sessionDate,
      isTest: engagement.isTest,
    },
  });

  if (intakeInsert.error) {
    await supabase.from('payments').delete().eq('payment_id', paymentId);
    if (uploadedPath) await supabase.storage.from('client-uploads').remove([uploadedPath]);
    console.error('Manual client intake insert failed.');
    return NextResponse.json({ error: 'Could not save the manual client questionnaire.' }, { status: 500 });
  }

  revalidatePath('/resources/career-diagnostic/submissions');
  return NextResponse.json({
    success: true,
    paymentId,
    serviceSlug: engagement.serviceSlug,
    isTest: engagement.isTest,
  }, { status: 201 });
}
