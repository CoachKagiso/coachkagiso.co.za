import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import DiagnosticPlaybookPdf from '@/components/DiagnosticPlaybookPdf';
import { getDiagnosticPlaybookBySlug } from '@/lib/career-diagnostic';
import { getStoredDiagnosticPlaybookPdfUrl } from '@/lib/diagnostic-playbook-assets';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

type PlaybookPdfRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: PlaybookPdfRouteProps) {
  const { slug } = await params;
  const archetype = getDiagnosticPlaybookBySlug(slug);

  if (!archetype) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('fresh') !== '1') {
    return NextResponse.redirect(getStoredDiagnosticPlaybookPdfUrl(slug), 302);
  }

  const buffer = await renderToBuffer(
    <DiagnosticPlaybookPdf archetype={archetype} siteUrl={getSiteUrl()} />
  );

  return new NextResponse(buffer as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${slug}-playbook.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
