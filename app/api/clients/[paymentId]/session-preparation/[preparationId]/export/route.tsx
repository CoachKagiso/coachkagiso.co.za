import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import SessionPreparationPdf from '@/components/career-tools/SessionPreparationPdf';
import { buildSessionPreparationDocx } from '@/lib/client-session-preparation-docx';
import {
  normalizeSessionPreparationExportOptions,
  sessionPreparationExportFileName,
} from '@/lib/client-session-preparation-export';
import { getClientSessionPreparation } from '@/lib/client-session-preparation-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanClientName(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; preparationId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { paymentId, preparationId } = await params;
    const preparation = await getClientSessionPreparation(paymentId, preparationId);
    if (!preparation) {
      return NextResponse.json({ error: 'Session preparation not found.' }, { status: 404 });
    }
    const options = normalizeSessionPreparationExportOptions(body);
    if (options.format === 'print') {
      return NextResponse.json({ error: 'Print preview is created in the dashboard.' }, { status: 400 });
    }
    const clientName = cleanClientName(body?.clientName);
    const fileName = sessionPreparationExportFileName({
      clientName,
      serviceSlug: preparation.serviceSlug,
      extension: options.format,
    });

    if (options.format === 'docx') {
      const buffer = await buildSessionPreparationDocx({ preparation, clientName, options });
      return new NextResponse(buffer as BodyInit, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'content-disposition': `attachment; filename="${fileName}"`,
          'cache-control': 'no-store',
        },
      });
    }

    const buffer = await renderToBuffer(
      <SessionPreparationPdf preparation={preparation} clientName={clientName} options={options} />,
    );
    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Choose Session Guide')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Session preparation export failed:', message || 'unknown error');
    return NextResponse.json({ error: 'Could not export this session preparation.' }, { status: 500 });
  }
}
