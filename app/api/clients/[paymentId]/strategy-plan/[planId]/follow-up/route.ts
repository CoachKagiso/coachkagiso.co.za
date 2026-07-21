import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { sendTransactionalEmailWithStatus, type BrevoSendResult } from '@/lib/brevo';
import { buildClientStrategyPlanEmail } from '@/lib/client-strategy-follow-up';
import {
  completeClientStrategyPlanDelivery,
  failClientStrategyPlanDelivery,
  getClientStrategyFollowUpState,
  getClientStrategyThemeReport,
  reserveClientStrategyPlanDelivery,
} from '@/lib/client-strategy-follow-up-store';
import { getClientStrategyPlan } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { recordSentEmail } from '@/lib/sent-emails';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

function getSubject(serviceSlug: 'career-clarity' | 'glow-up-vip') {
  return serviceSlug === 'career-clarity'
    ? 'Your personalized 14-day Career Clarity plan'
    : 'Your personalized 30-day Glow Up support plan';
}

function reservationError(message: string) {
  if (message.includes('already been sent') || message.includes('already in progress')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (message.includes('Only an approved plan')) {
    return NextResponse.json({ error: 'Only an approved plan can be sent.' }, { status: 409 });
  }
  if (message.includes('email is missing or invalid')) {
    return NextResponse.json({ error: 'Add a valid client email to the payment before sending.' }, { status: 422 });
  }
  return null;
}

async function isTestEngagement(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('payments')
    .select('payment_id, is_test')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (result.error?.message.includes('is_test')) return false;
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data?.is_test);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId, planId } = await params;
  try {
    const plan = await getClientStrategyPlan(paymentId, planId);
    if (!plan) return NextResponse.json({ error: 'Strategy plan not found.' }, { status: 404 });

    const [followUp, themeReport] = await Promise.all([
      getClientStrategyFollowUpState(paymentId, planId),
      getClientStrategyThemeReport(),
    ]);
    return NextResponse.json({
      ...followUp,
      subject: getSubject(plan.serviceSlug),
      themeReport,
    });
  } catch {
    console.error('Strategy plan follow-up load failed.');
    return NextResponse.json({ error: 'Could not load delivery and follow-up details.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (body?.confirm !== true) {
    return NextResponse.json({ error: 'Delivery confirmation is required.' }, { status: 400 });
  }

  const { paymentId, planId } = await params;
  const plan = await getClientStrategyPlan(paymentId, planId).catch(() => null);
  if (!plan) return NextResponse.json({ error: 'Strategy plan not found.' }, { status: 404 });
  if (plan.status !== 'approved') {
    return NextResponse.json({ error: 'Only an approved plan can be sent.' }, { status: 409 });
  }
  try {
    if (await isTestEngagement(paymentId)) {
      return NextResponse.json({ error: 'Test records cannot send a client strategy plan.' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Could not verify whether this engagement is safe to send.' }, { status: 500 });
  }

  let reservation;
  try {
    reservation = await reserveClientStrategyPlanDelivery(plan.id, getSubject(plan.serviceSlug));
  } catch (error) {
    const knownResponse = reservationError(error instanceof Error ? error.message : '');
    if (knownResponse) return knownResponse;
    console.error('Strategy plan delivery reservation failed.');
    return NextResponse.json({ error: 'Could not reserve this delivery.' }, { status: 500 });
  }

  const email = buildClientStrategyPlanEmail({
    serviceSlug: plan.serviceSlug,
    recipientName: reservation.recipientName,
    content: plan.editedContent,
  });

  let providerResult: BrevoSendResult;
  try {
    providerResult = await sendTransactionalEmailWithStatus({
      to: [{ email: reservation.recipientEmail, name: reservation.recipientName }],
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: { 'Idempotency-Key': reservation.id },
      tags: ['client-strategy-plan', plan.serviceSlug],
    });
  } catch {
    return NextResponse.json(
      { error: 'The Brevo result is uncertain. Verify Brevo before retrying this delivery.' },
      { status: 502 },
    );
  }

  if (providerResult.outcome !== 'accepted') {
    if (providerResult.outcome === 'unavailable' || providerResult.outcome === 'rejected') {
      await failClientStrategyPlanDelivery(reservation.id, 'brevo_send_failed').catch(() => null);
      return NextResponse.json(
        { error: 'Brevo did not accept the email. The approved plan remains ready to retry.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'Brevo responded without a message ID. Verify Brevo before retrying this delivery.' },
      { status: 502 },
    );
  }

  let delivery;
  try {
    delivery = await completeClientStrategyPlanDelivery(reservation.id, providerResult.messageId);
  } catch {
    console.error('Strategy plan delivery confirmation could not be saved after provider acceptance.');
    return NextResponse.json(
      { error: 'Brevo accepted the email, but the delivery record could not be completed. Verify Brevo before retrying.' },
      { status: 502 },
    );
  }

  await recordSentEmail({
    toEmail: reservation.recipientEmail,
    toName: reservation.recipientName,
    subject: email.subject,
    body: email.text,
    templateId: 'client_strategy_plan_v1',
    serviceInterest: plan.serviceSlug,
    origin: 'client_strategy_plan',
    externalProvider: 'brevo',
    externalMessageId: providerResult.messageId,
    deliveryStatus: 'sent',
    sentAt: delivery.deliveredAt,
  }).catch(() => console.error('Strategy plan sent email audit record could not be saved.'));

  const [followUp, themeReport] = await Promise.all([
    getClientStrategyFollowUpState(paymentId, planId),
    getClientStrategyThemeReport(),
  ]);
  revalidatePath('/resources/career-diagnostic/submissions');
  return NextResponse.json({ ...followUp, subject: email.subject, themeReport });
}
