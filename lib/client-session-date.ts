import { createSupabaseServiceClient } from '@/lib/supabase-server';

/**
 * Resolves the actual session date for a client, in order of how trustworthy the source is.
 *
 * Older engagements predate the booking time being copied onto the intake row, so the intake is
 * only the first place to look. The raw Cal webhook payload is kept in webhook_logs and still
 * carries an exact startTime, which recovers the date for those clients without asking anyone to
 * retype it. Email bodies are deliberately not parsed: a date written in prose is ambiguous about
 * year and timezone, and an email's own sent time is not the session time.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Cal logs the whole webhook body, so the booking sits one level down under `payload`. */
function readStartTimeFromWebhookPayload(payload: unknown): string | null {
  const body = asRecord(payload);
  if (!body) return null;
  const booking = asRecord(body.payload) || body;
  return readIsoDate(booking.startTime) || readIsoDate(booking.start_time);
}

export type ClientSessionDateSource = 'intake' | 'cal_webhook_log' | null;

export type ResolvedClientSessionDate = {
  startTime: string | null;
  source: ClientSessionDateSource;
};

export async function resolveClientSessionDate(paymentId: string): Promise<ResolvedClientSessionDate> {
  const supabase = createSupabaseServiceClient();

  const intakeResult = await supabase
    .from('intake_submissions')
    .select('source_metadata, source_reference')
    .eq('payment_id', paymentId)
    .eq('duplicate_attempt', false)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intakeResult.error) throw new Error(intakeResult.error.message);

  const sourceMetadata = asRecord(intakeResult.data?.source_metadata) || {};
  // Cal bookings store startTime; manually created engagements store sessionDate.
  const fromIntake = readIsoDate(sourceMetadata.startTime) || readIsoDate(sourceMetadata.sessionDate);
  if (fromIntake) return { startTime: fromIntake, source: 'intake' };

  const bookingUid = typeof intakeResult.data?.source_reference === 'string'
    ? intakeResult.data.source_reference.trim()
    : '';

  if (bookingUid) {
    const byUid = await supabase
      .from('webhook_logs')
      .select('payload, created_at')
      .eq('source', 'cal')
      .eq('booking_uid', bookingUid)
      .order('created_at', { ascending: false })
      .limit(10);
    if (byUid.error && !byUid.error.message.includes('webhook_logs')) throw new Error(byUid.error.message);
    for (const row of byUid.data || []) {
      const startTime = readStartTimeFromWebhookPayload(row.payload);
      if (startTime) return { startTime, source: 'cal_webhook_log' };
    }
  }

  // Falls back to the buyer email, which webhook_logs indexes, for intakes saved without a
  // booking reference.
  const paymentResult = await supabase
    .from('payments')
    .select('buyer_email')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (paymentResult.error) throw new Error(paymentResult.error.message);

  const buyerEmail = typeof paymentResult.data?.buyer_email === 'string'
    ? paymentResult.data.buyer_email.trim().toLowerCase()
    : '';
  if (!buyerEmail) return { startTime: null, source: null };

  const byEmail = await supabase
    .from('webhook_logs')
    .select('payload, created_at')
    .eq('source', 'cal')
    .ilike('email', buyerEmail)
    .order('created_at', { ascending: false })
    .limit(10);
  if (byEmail.error && !byEmail.error.message.includes('webhook_logs')) throw new Error(byEmail.error.message);
  for (const row of byEmail.data || []) {
    const startTime = readStartTimeFromWebhookPayload(row.payload);
    if (startTime) return { startTime, source: 'cal_webhook_log' };
  }

  return { startTime: null, source: null };
}
