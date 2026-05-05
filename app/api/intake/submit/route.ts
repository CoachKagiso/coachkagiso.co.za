import { NextResponse } from 'next/server';
import { getAsyncService } from '@/lib/buying-flow';
import { addClientToBrevoList } from '@/lib/brevo';
import {
  notifyKagisoIntake,
  sendClientIntakeConfirmation,
} from '@/lib/notifications';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function cleanFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const paymentId = String(formData.get('payment_id') || '');
  const serviceSlug = String(formData.get('service_slug') || '');
  const service = getAsyncService(serviceSlug);

  if (!paymentId || !service) {
    return NextResponse.json({ error: 'Missing service or payment ID' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('payment_id, service_slug, status, confirmed_at, created_at')
    .eq('payment_id', paymentId)
    .maybeSingle();

  const confirmedAt = payment?.confirmed_at ? new Date(payment.confirmed_at).getTime() : 0;
  const isRecent = confirmedAt > Date.now() - 30 * 60 * 1000;

  if (
    paymentError ||
    !payment ||
    payment.status !== 'confirmed' ||
    payment.service_slug !== service.slug ||
    !isRecent
  ) {
    return NextResponse.json({ error: 'Payment could not be verified' }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from('intake_submissions')
    .select('id')
    .eq('payment_id', paymentId)
    .eq('duplicate_attempt', false)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from('intake_submissions')
      .update({ duplicate_attempt: true })
      .eq('id', existing[0].id);

    return NextResponse.json({
      duplicate: true,
      message:
        "It looks like you've already submitted. If you need to make changes, email hello@coachkagiso.co.za",
    });
  }

  const values: Record<string, string> = {};
  for (const field of service.fields) {
    const value = String(formData.get(field.name) || '').trim();
    values[field.name] = value;

    if (field.required && !value) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
  }

  const fullName = values.fullName;
  const email = values.email;
  const whatsapp = values.whatsapp;
  let signedCvUrl = '';

  const file = formData.get('cv_file');
  if (service.requiresCvUpload && !(file instanceof File && file.size > 0)) {
    return NextResponse.json({ error: 'CV file is required' }, { status: 400 });
  }

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be a PDF or Word document' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const path = `${service.folder}/${paymentId}/${Date.now()}-${cleanFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from('client-uploads')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json({ error: 'Could not upload file' }, { status: 500 });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('client-uploads')
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signedError) {
      console.error(signedError);
    } else {
      signedCvUrl = signedData.signedUrl;
    }
  }

  const { error: insertError } = await supabase.from('intake_submissions').insert({
    payment_id: paymentId,
    service_slug: service.slug,
    form_data: values,
    cv_file_url: signedCvUrl || null,
  });

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: 'Could not save intake form' }, { status: 500 });
  }

  await supabase
    .from('payments')
    .update({ intake_submitted_at: new Date().toISOString() })
    .eq('payment_id', paymentId);

  await Promise.all([
    sendClientIntakeConfirmation({ service, email, fullName }),
    notifyKagisoIntake({ service, name: fullName, email, whatsapp, formData: values, signedCvUrl }),
    addClientToBrevoList(email, fullName),
  ]);

  return NextResponse.json({
    success: true,
    message: `Got it. Kagiso will be in touch within ${service.turnaround}.`,
  });
}
