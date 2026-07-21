import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import {
  BOOKING_PAYMENT_WINDOW_HOURS,
  createBookingPaymentToken,
  getBookingPaymentId,
  getBookingPaymentSecret,
  getBookingPaymentServiceSlug,
} from '@/lib/booking-payment';
import { sendTransactionalEmail } from '@/lib/brevo';
import { asyncServices, formatCurrency } from '@/lib/buying-flow';
import {
  buildCalBookingIntake,
  normalizeCalBookingResponses,
  type CalBookingData,
} from '@/lib/cal-booking-intake';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { getSiteUrl } from '@/lib/env';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENT_SLUG_MAP: Record<string, string> = {
  'discovery-call': 'Free Discovery Call',
  'career-clarity': 'Career Clarity Session',
  'glow-up-vip': 'Glow Up VIP Package',
  'saturday-masterclass': 'Saturday Masterclass',
};

type CalWebhookPayload = {
  triggerEvent?: string;
  payload?: CalBookingData;
};

type WebhookLogValues = {
  source: 'cal';
  event_type: string | null;
  booking_uid: string | null;
  email: string | null;
  matched: boolean;
  lead_id?: string | null;
  payload: CalWebhookPayload;
  error: string | null;
};

function normalizeSignature(signature: string | null) {
  return signature?.replace(/^sha256=/i, '').trim().toLowerCase() || '';
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  const receivedSignature = normalizeSignature(signatureHeader);
  if (!receivedSignature) return false;

  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = Buffer.from(receivedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

function getBookingPayload(payload: CalWebhookPayload) {
  return payload.payload || {};
}

function getEventSlug(payload: CalWebhookPayload) {
  const booking = getBookingPayload(payload);
  return booking.eventType?.slug || booking.type || '';
}

function getBookingUid(payload: CalWebhookPayload) {
  const booking = getBookingPayload(payload);
  return booking.uid || booking.bookingUid || '';
}

function getBookerEmail(payload: CalWebhookPayload) {
  const booking = getBookingPayload(payload);
  const attendeeEmail = booking.attendees?.find((attendee) => attendee.email)?.email;
  const normalizedEmail = normalizeCalBookingResponses(booking).email;
  const responseEmail = typeof normalizedEmail === 'string' ? normalizedEmail : '';
  return String(attendeeEmail || responseEmail || '').toLowerCase().trim();
}

function getBookerName(payload: CalWebhookPayload) {
  const booking = getBookingPayload(payload);
  const attendeeName = booking.attendees?.find((attendee) => attendee.email || attendee.name)?.name;
  const normalizedName = normalizeCalBookingResponses(booking).fullName;
  const responseName = typeof normalizedName === 'string' ? normalizedName : '';
  return String(attendeeName || responseName || '').trim();
}

async function persistAcceptedBookingIntake(input: {
  payload: CalWebhookPayload;
  eventSlug: string;
  bookingUid: string;
  email: string;
  webhookVersion: string | null;
}) {
  const serviceSlug = getBookingPaymentServiceSlug(input.eventSlug);
  if (!serviceSlug) return null;

  const service = asyncServices[serviceSlug];
  const paymentId = getBookingPaymentId(serviceSlug, input.bookingUid);
  const name = getBookerName(input.payload);
  const intake = buildCalBookingIntake(getBookingPayload(input.payload), {
    webhookVersion: input.webhookVersion,
  });
  const supabase = createSupabaseServiceClient();

  const { error: paymentError } = await supabase.from('payments').upsert(
    {
      payment_id: paymentId,
      service_slug: serviceSlug,
      amount: service.amount,
      status: 'pending',
      buyer_email: input.email,
      buyer_name: name || null,
    },
    { onConflict: 'payment_id', ignoreDuplicates: true },
  );

  if (paymentError) {
    throw new Error(`Could not create booking engagement: ${paymentError.message}`);
  }

  const { data: existingIntake, error: existingIntakeError } = await supabase
    .from('intake_submissions')
    .select('form_data, cv_file_url, source_metadata')
    .eq('source', 'cal')
    .eq('source_reference', input.bookingUid)
    .maybeSingle();

  if (existingIntakeError) {
    throw new Error(`Could not inspect existing booking intake: ${existingIntakeError.message}`);
  }

  const currentSourceMetadata = Object.fromEntries(
    Object.entries(intake.sourceMetadata).filter(([, value]) => value !== null),
  );

  const { error: intakeError } = await supabase.from('intake_submissions').upsert(
    {
      payment_id: paymentId,
      service_slug: serviceSlug,
      form_data: {
        ...((existingIntake?.form_data as Record<string, unknown> | null) || {}),
        ...intake.formData,
      },
      cv_file_url: intake.cvFileUrl || existingIntake?.cv_file_url || null,
      duplicate_attempt: false,
      source: 'cal',
      source_reference: input.bookingUid,
      source_metadata: {
        ...((existingIntake?.source_metadata as Record<string, unknown> | null) || {}),
        ...currentSourceMetadata,
      },
    },
    { onConflict: 'source,source_reference' },
  );

  if (intakeError) {
    throw new Error(`Could not save booking intake: ${intakeError.message}`);
  }

  const { error: intakeStatusError } = await supabase
    .from('payments')
    .update({ intake_submitted_at: new Date().toISOString() })
    .eq('payment_id', paymentId);

  if (intakeStatusError) {
    throw new Error(`Could not mark booking intake received: ${intakeStatusError.message}`);
  }

  return { paymentId, serviceSlug };
}

async function sendAcceptedBookingPaymentLink(input: {
  payload: CalWebhookPayload;
  eventSlug: string;
  bookingUid: string;
  email: string;
}) {
  const serviceSlug = getBookingPaymentServiceSlug(input.eventSlug);
  if (!serviceSlug) return null;

  const service = asyncServices[serviceSlug];
  const secret = getBookingPaymentSecret();
  if (!secret) {
    console.error('Accepted booking payment link could not be created: token secret is missing');
    return { sent: false, paymentUrl: null, service };
  }

  const supabase = createSupabaseServiceClient();
  const { data: existingDelivery } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('source', 'cal')
    .eq('event_type', 'PAYMENT_LINK_SENT')
    .eq('booking_uid', input.bookingUid)
    .limit(1)
    .maybeSingle();

  const name = getBookerName(input.payload);
  const token = createBookingPaymentToken(
    {
      serviceSlug,
      bookingUid: input.bookingUid,
      email: input.email,
      name,
    },
    secret,
  );
  const paymentUrl = `${getSiteUrl()}/buy/${serviceSlug}?booking_token=${encodeURIComponent(token)}`;

  if (existingDelivery) {
    return { sent: true, paymentUrl, service, duplicate: true };
  }

  const firstName = name.split(/\s+/)[0] || 'there';
  const delivery = await sendTransactionalEmail({
    to: [{ email: input.email, name: name || undefined }],
    subject: `Your ${service.title} request was accepted - payment is the final step`,
    text: `Hi ${firstName},

Kagiso has accepted your requested appointment for ${service.title}.

Complete the final payment step here to confirm your appointment:
${paymentUrl}

Amount: ${formatCurrency(service.amount)}
This private payment link is valid for ${BOOKING_PAYMENT_WINDOW_HOURS} hours.

You do not need to submit your details again. The information you shared with your booking request is already connected to the appointment.

Talk soon,
Kagiso`,
  });

  await logWebhookEvent({
    source: 'cal',
    event_type: delivery ? 'PAYMENT_LINK_SENT' : 'PAYMENT_LINK_SEND_FAILED',
    booking_uid: input.bookingUid,
    email: input.email,
    matched: true,
    payload: input.payload,
    error: delivery ? null : 'Brevo did not confirm payment-link email delivery',
  });

  return { sent: Boolean(delivery), paymentUrl, service, duplicate: false };
}

async function logWebhookEvent(values: WebhookLogValues) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('webhook_logs').insert(values);

  if (error) {
    console.error('Cal webhook: failed to write webhook log', {
      bookingUid: values.booking_uid,
      eventType: values.event_type,
      matched: values.matched,
      error: error.message,
    });
  }
}

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error('CAL_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-cal-signature-256');

  if (!verifySignature(rawBody, signatureHeader, secret)) {
    console.warn('Cal webhook rejected: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: CalWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CalWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.triggerEvent !== 'BOOKING_CREATED' && payload.triggerEvent !== 'BOOKING_CONFIRMED') {
    return NextResponse.json({ received: true });
  }

  const eventSlug = getEventSlug(payload);
  const bookingUid = getBookingUid(payload);
  const bookerEmail = getBookerEmail(payload);
  const serviceLabel = EVENT_SLUG_MAP[eventSlug] || eventSlug || 'unknown';
  const webhookVersion = request.headers.get('x-cal-webhook-version');

  if (!bookingUid) {
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: null,
      email: bookerEmail || null,
      matched: false,
      payload,
      error: 'No booking UID in payload',
    });
    console.warn('Cal booking received with no booking UID', { eventSlug });
    return NextResponse.json({ received: true });
  }

  if (!bookerEmail) {
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: bookingUid,
      email: null,
      matched: false,
      payload,
      error: 'No attendee email in payload',
    });
    console.warn('Cal booking received with no attendee email', { bookingUid, eventSlug });
    return NextResponse.json({ received: true });
  }

  try {
    await persistAcceptedBookingIntake({
      payload,
      eventSlug,
      bookingUid,
      email: bookerEmail,
      webhookVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown booking intake persistence error';
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: bookingUid,
      email: bookerEmail,
      matched: false,
      payload,
      error: message,
    });
    console.error('Cal webhook: failed to persist booking intake', {
      bookingUid,
      eventSlug,
      email: bookerEmail,
      error: message,
    });
    return NextResponse.json({ error: 'Could not persist booking intake' }, { status: 500 });
  }

  const paymentLink = await sendAcceptedBookingPaymentLink({
    payload,
    eventSlug,
    bookingUid,
    email: bookerEmail,
  });

  if (paymentLink && !paymentLink.duplicate) {
    await recordDashboardNotification({
      eventType: 'cal_booking',
      source: 'cal-webhook',
      title: `${paymentLink.sent ? 'Payment link sent' : 'Payment link needs forwarding'} - ${paymentLink.service.title}`,
      description: paymentLink.sent
        ? `${bookerEmail} received the private checkout link after the booking was accepted.`
        : `The automatic email could not be confirmed. Open this notification and forward the private checkout link to ${bookerEmail}.`,
      contactName: getBookerName(payload) || null,
      contactEmail: bookerEmail,
      href: paymentLink.paymentUrl,
      metadata: {
        bookingUid,
        eventSlug,
        paymentLinkSent: paymentLink.sent,
      },
    });
  }

  const supabase = createSupabaseServiceClient();
  const { data: leads, error: lookupError } = await supabase
    .from('diagnostic_submissions')
    .select('id, email, lead_status, submitted_at')
    .ilike('email', bookerEmail)
    .order('submitted_at', { ascending: false })
    .limit(1);
  const lead = leads?.[0];

  if (lookupError) {
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: bookingUid,
      email: bookerEmail,
      matched: false,
      payload,
      error: `Supabase lookup error: ${lookupError.message}`,
    });
    console.error('Cal webhook: lead lookup failed', { bookingUid, eventSlug, email: bookerEmail });
    return NextResponse.json({ received: true });
  }

  if (!lead) {
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: bookingUid,
      email: bookerEmail,
      matched: false,
      payload,
      error: 'Cal booking received for unmatched email; no diagnostic_submissions record found',
    });
    await recordDashboardNotification({
      eventType: 'cal_booking',
      source: 'cal-webhook',
      title: `New Cal.com booking - ${serviceLabel}`,
      description: `A Cal.com booking came in for ${bookerEmail}, but no matching diagnostic lead was found.`,
      contactEmail: bookerEmail,
      href: `mailto:${bookerEmail}?subject=${encodeURIComponent(serviceLabel)}`,
      metadata: {
        bookingUid,
        eventSlug,
        matched: false,
      },
    });
    console.warn('Cal booking received for unmatched email', { bookingUid, eventSlug, email: bookerEmail });
    return NextResponse.json({ received: true });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('diagnostic_submissions')
    .update({
      lead_status: 'discovery_booked',
      next_follow_up_at: null,
      last_contacted_at: now,
      updated_at: now,
    })
    .eq('id', lead.id);

  if (updateError) {
    await logWebhookEvent({
      source: 'cal',
      event_type: eventSlug || null,
      booking_uid: bookingUid,
      email: bookerEmail,
      matched: true,
      lead_id: lead.id,
      payload,
      error: `Status update failed: ${updateError.message}`,
    });
    await recordDashboardNotification({
      eventType: 'cal_booking',
      source: 'cal-webhook',
      title: `Cal.com booking needs review - ${serviceLabel}`,
      description: `A booking came in for ${bookerEmail}, but the matched lead could not be updated automatically.`,
      contactEmail: bookerEmail,
      href: `mailto:${bookerEmail}?subject=${encodeURIComponent(serviceLabel)}`,
      metadata: {
        bookingUid,
        eventSlug,
        matched: true,
        leadId: lead.id,
        error: updateError.message,
      },
    });
    console.error('Cal webhook: failed to update matched lead', { bookingUid, eventSlug, leadId: lead.id });
    return NextResponse.json({ received: true });
  }

  await logWebhookEvent({
    source: 'cal',
    event_type: eventSlug || null,
    booking_uid: bookingUid,
    email: bookerEmail,
    matched: true,
    lead_id: lead.id,
    payload,
    error: null,
  });

  await recordDashboardNotification({
    eventType: 'cal_booking',
    source: 'cal-webhook',
    title: `New Cal.com booking - ${serviceLabel}`,
    description: `${bookerEmail} booked ${serviceLabel}. The matched diagnostic lead was moved to discovery booked.`,
    contactEmail: bookerEmail,
    href: `mailto:${bookerEmail}?subject=${encodeURIComponent(serviceLabel)}`,
    metadata: {
      bookingUid,
      eventSlug,
      matched: true,
      leadId: lead.id,
    },
  });

  console.log('Cal booking matched to diagnostic lead', {
    bookingUid,
    eventSlug,
    leadId: lead.id,
    serviceLabel,
  });

  return NextResponse.json({ received: true });
}
