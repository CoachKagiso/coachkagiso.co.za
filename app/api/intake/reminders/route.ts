import { NextResponse } from 'next/server';
import { asyncServices } from '@/lib/buying-flow';
import { getContactEmail } from '@/lib/env';
import { sendTransactionalEmail } from '@/lib/brevo';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const requestSecret = new URL(request.url).searchParams.get('secret');

  if (configuredSecret && requestSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('payments')
    .select('payment_id, service_slug, buyer_email, buyer_name, created_at')
    .eq('status', 'confirmed')
    .is('intake_submitted_at', null)
    .is('intake_reminder_sent_at', null)
    .lt('created_at', cutoff);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not fetch reminders' }, { status: 500 });
  }

  for (const payment of data || []) {
    const service = asyncServices[payment.service_slug as keyof typeof asyncServices];
    if (!service || service.kind === 'booking') continue;

    await sendTransactionalEmail({
      to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
      subject: `Follow Up Needed — ${payment.buyer_name || 'Client'} paid but hasn't submitted intake`,
      text: `${payment.buyer_name || 'A client'} paid for ${service.title} 24 hours ago but hasn't submitted their intake form.\n\nTheir email: ${payment.buyer_email || 'Not supplied'}\n\nFollow up via WhatsApp or email to prompt them to complete the form.\n`,
    });

    await supabase
      .from('payments')
      .update({ intake_reminder_sent_at: new Date().toISOString() })
      .eq('payment_id', payment.payment_id);
  }

  return NextResponse.json({ sent: data?.length || 0 });
}
