import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type MessageRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: MessageRouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : url.searchParams.get('key');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('sent_emails').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/resources/career-diagnostic/submissions');
  return NextResponse.json({ success: true });
}
