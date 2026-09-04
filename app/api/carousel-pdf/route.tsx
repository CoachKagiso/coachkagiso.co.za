import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CarouselPdfDocument, type CarouselPdfSlide } from '@/components/content/CarouselPdfDocument';
import type { CarouselTemplateOption } from '@/lib/content/carousel-template-registry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload: { deck: CarouselPdfSlide[]; template: CarouselTemplateOption; profilePhotoUrl?: string | null } = await request.json();
    const { deck, template, profilePhotoUrl } = payload;

    if (!Array.isArray(deck) || !deck.length) {
      return NextResponse.json({ error: 'Deck is required' }, { status: 400 });
    }

    const buffer = await renderToBuffer(
      <CarouselPdfDocument deck={deck} template={template} profilePhotoUrl={profilePhotoUrl || null} />,
    );

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="carousel.pdf"',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('/api/carousel-pdf render error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 });
  }
}
