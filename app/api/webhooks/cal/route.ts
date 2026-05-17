import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
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
  payload?: {
    uid?: string;
    type?: string;
    eventType?: {
      slug?: string;
    };
    attendees?: {
      email?: string;
    }[];
    responses?: {
      email?: {
        value?: string;
      };
    };
  };
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
  return booking.uid || 'unknown';
}

function getBookerEmail(payload: CalWebhookPayload) {
  const booking = getBookingPayload(payload);
  const attendeeEmail = booking.attendees?.find((attendee) => attendee.email)?.email;
  const responseEmail = booking.responses?.email?.value;
  return String(attendeeEmail || responseEmail || '').toLowerCase().trim();
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

  if (payload.triggerEvent !== 'BOOKING_CREATED') {
    return NextResponse.json({ received: true });
  }

  const eventSlug = getEventSlug(payload);
  const bookingUid = getBookingUid(payload);
  const bookerEmail = getBookerEmail(payload);
  const serviceLabel = EVENT_SLUG_MAP[eventSlug] || eventSlug || 'unknown';

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
    console.warn('Cal booking received for unmatched email', { bookingUid, eventSlug, email: bookerEmail });
    return NextResponse.json({ received: true });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('diagnostic_submissions')
    .update({
      lead_status: 'discovery_booked',
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

  console.log('Cal booking matched to diagnostic lead', {
    bookingUid,
    eventSlug,
    leadId: lead.id,
    serviceLabel,
  });

  return NextResponse.json({ received: true });
}
