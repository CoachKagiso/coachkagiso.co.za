import { NextResponse } from 'next/server';
import { getAsyncService } from '@/lib/buying-flow';
import { addClientToBrevoList } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import {
  notifyKagisoIntake,
  sendClientIntakeConfirmation,
} from '@/lib/notifications';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const INTAKE_ACCESS_WINDOW_DAYS = 14;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const PHONE_PATTERN = /^[0-9+() -]{7,30}$/;

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
  const isRecent = confirmedAt > Date.now() - INTAKE_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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
      heading: 'Your brief is already in.',
      message:
        "Your brief is already safely submitted. If you need to add anything, email hello@coachkagiso.co.za and include your order reference.",
      detail:
        "Keep an eye on your inbox. If Kagiso needs one quick clarification, she'll email you directly.",
    });
  }

  const values: Record<string, string> = {};
  for (const field of service.fields) {
    const rawValue = String(formData.get(field.name) || '').trim();
    const value = field.type === 'tel' ? rawValue.replace(/[^0-9+() -]/g, '') : rawValue;
    values[field.name] = value;

    if (field.required && !value) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }

    if (field.type === 'tel' && value && !PHONE_PATTERN.test(value)) {
      return NextResponse.json({ error: `${field.label} must be a valid phone number` }, { status: 400 });
    }
  }

  const fullName = values.fullName;
  const email = values.email;
  const whatsapp = values.whatsapp;
  const isEventService = service.kind === 'event';
  const briefAcknowledgement = String(formData.get('brief_acknowledgement') || '') === 'yes';

  if (!briefAcknowledgement) {
    return NextResponse.json(
      { error: 'Please confirm that your information is accurate before submitting' },
      { status: 400 },
    );
  }

  let signedCvUrl = '';
  const cvEmailFallback = String(formData.get('cv_email_fallback') || '') === 'yes';
  const cvDeliveryMethod =
    service.requiresCvUpload
      ? cvEmailFallback
        ? 'email_after_submit'
        : 'uploaded'
      : 'not_required';

  const file = formData.get('cv_file');
  if (service.requiresCvUpload && !(file instanceof File && file.size > 0) && !cvEmailFallback) {
    return NextResponse.json({ error: 'Please upload your CV or choose the email option' }, { status: 400 });
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
    form_data: {
      ...values,
      briefAcknowledgement: true,
      briefAcknowledgedAt: new Date().toISOString(),
      cvDeliveryMethod,
    },
    cv_file_url: signedCvUrl || null,
  });

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: 'Could not save intake form' }, { status: 500 });
  }

  await supabase
    .from('payments')
    .update({ intake_submitted_at: cvDeliveryMethod === 'uploaded' || cvDeliveryMethod === 'not_required' ? new Date().toISOString() : null })
    .eq('payment_id', paymentId);

  await Promise.all([
    sendClientIntakeConfirmation({ service, email, fullName, cvDeliveryMethod, paymentId }),
    notifyKagisoIntake({ service, name: fullName, email, whatsapp, formData: values, signedCvUrl, cvDeliveryMethod }),
    addClientToBrevoList(email, fullName),
    recordDashboardNotification({
      eventType: 'intake_submitted',
      source: 'client-intake-form',
      title: `New intake - ${service.title}`,
      description:
        cvDeliveryMethod === 'email_after_submit'
          ? `${fullName} submitted the brief for ${service.title}, but the CV still needs to arrive by email.`
          : `${fullName} submitted the brief for ${service.title}. ${cvDeliveryMethod === 'uploaded' ? 'CV uploaded.' : 'No CV required.'}`,
      contactName: fullName,
      contactEmail: email,
      href: `mailto:${email}?subject=${encodeURIComponent(`Your ${service.title} intake`)}`,
      metadata: {
        paymentId,
        serviceSlug: service.slug,
        whatsapp: whatsapp || null,
        cvDeliveryMethod,
        hasSignedCvUrl: Boolean(signedCvUrl),
      },
    }),
  ]);

  const isWaitingForCv = cvDeliveryMethod === 'email_after_submit';

  if (isEventService) {
    return NextResponse.json({
      success: true,
      heading: 'Your prep notes are in.',
      message:
        'Your seat is secured and your prep notes have been received. Kagiso will use them to shape the session around the real work people are bringing.',
      detail:
        'Keep an eye on your inbox for the Microsoft Teams link, prep details, and anything you need before the masterclass.',
    });
  }

  return NextResponse.json({
    success: true,
    heading: isWaitingForCv ? 'Your brief is in. CV still needed.' : 'Your brief is safely in.',
    message: isWaitingForCv
      ? `Your brief has been received. Please email your CV so Kagiso can start the work. Your ${service.turnaround} turnaround starts once the CV arrives.`
      : `Your brief is safely in. Kagiso will review it and deliver within ${service.turnaround}. A confirmation email is on its way.`,
    detail: isWaitingForCv
      ? `Send your CV to hello@coachkagiso.co.za using your order reference. Once it lands, Kagiso can begin.`
      : `Keep an eye on your inbox. If Kagiso needs one quick clarification, she'll email you directly.`,
  });
}
