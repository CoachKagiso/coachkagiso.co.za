import React from 'react';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { getSiteUrl } from '@/lib/env';
import type { CarouselTemplateOption } from '@/lib/content/carousel-template-registry';
import type { CarouselSlide } from './ContentStudio';

// Self-host the SIL OFL Inter + Playfair Display binaries so the exported PDF
// uses brand fonts and never a woff2/Google-Fonts-CSS path that React PDF
// cannot parse. Resolved against the live origin so the server-side renderer
// can fetch the TTF bytes.
const ORIGIN = getSiteUrl();
const FONT = (name: string) => `${ORIGIN}/fonts/${name}`;

Font.register({ family: 'Inter', fontWeight: 400, src: FONT('Inter-Regular.ttf') });
Font.register({ family: 'Inter', fontWeight: 500, src: FONT('Inter-Medium.ttf') });
Font.register({ family: 'Inter', fontWeight: 600, src: FONT('Inter-SemiBold.ttf') });
Font.register({ family: 'Inter', fontWeight: 700, src: FONT('Inter-Bold.ttf') });
Font.register({ family: 'Playfair Display', fontWeight: 500, src: FONT('PlayfairDisplay-Medium.ttf') });
Font.register({ family: 'Playfair Display', fontWeight: 600, src: FONT('PlayfairDisplay-SemiBold.ttf') });
Font.register({ family: 'Playfair Display', fontWeight: 700, src: FONT('PlayfairDisplay-Bold.ttf') });

// CHANGE: disable hyphenation so text wraps at word boundaries only and no
// mid-word hyphens appear in the exported PDF. Returns the whole word back so
// the layout engine never splits it.
try {
  Font.registerHyphenationCallback(() => ['']);
} catch {
  // registerHyphenationCallback is opt-in on supported versions; ignore if absent.
}

export const CAROUSEL_PDF_PAGE = { width: 1080, height: 1350 } as const;
export const CAROUSEL_PDF_SIDE_PAD = 96;
export const CAROUSEL_PDF_VERT_PAD = 140;
// Full content width the HTML lane uses: 1080 - 2*96.
export const CAROUSEL_PDF_CONTENT_WIDTH = CAROUSEL_PDF_PAGE.width - 2 * CAROUSEL_PDF_SIDE_PAD; // 888

export type CarouselPdfSlide = {
  slide: CarouselSlide;
  role: CarouselSlide['role'];
  composition: string;
  headlineSize: number;
  eyebrow: string;
};

export type CarouselPdfProps = {
  deck: CarouselPdfSlide[];
  template: CarouselTemplateOption;
};

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    width: CAROUSEL_PDF_PAGE.width,
    height: CAROUSEL_PDF_PAGE.height,
    paddingVertical: CAROUSEL_PDF_VERT_PAD,
    paddingHorizontal: CAROUSEL_PDF_SIDE_PAD,
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  footerRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  wordmark: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 26,
    letterSpacing: 0.18 * 26,
  },
  handle: {
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 22,
    letterSpacing: 0.12 * 22,
    textTransform: 'uppercase',
  },
  eyebrow: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 26,
    letterSpacing: 0.14 * 26,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  counterPill: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 24,
    letterSpacing: 0.06 * 24,
    borderRadius: 40,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  headline: {
    fontFamily: 'Playfair Display',
    fontWeight: 600,
    lineHeight: 1.0,
    width: CAROUSEL_PDF_CONTENT_WIDTH,
  },
  body: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 36,
    lineHeight: 1.5,
    marginTop: 20,
    width: CAROUSEL_PDF_CONTENT_WIDTH,
  },
  footerDash: {
    height: 4,
    width: 48,
    borderRadius: 2,
  },
  footerLabel: {
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 22,
    letterSpacing: 0.12 * 22,
    textTransform: 'uppercase',
  },
  stripDot: {
    width: 27,
    height: 4,
    borderRadius: 2,
  },
});

function resolveComposition(slide: CarouselSlide): string {
  return slide.composition === 'auto' ? 'note_card' : slide.composition;
}

// CHANGE (brief #6): in the vector PDF only, emoji bullets (e.g.
// signature_narrative CTA bullets) are replaced with Rodeo Dust dot/dash
// bullets. PNG keeps emoji intact.
function replaceEmojiBullets(text: string): string {
  return text.replace(/[\u{1F38F}\u{1F50F}\u{1F389}\u{1F44C}\u{1F91D}\u{1F44D}\u{1F98C}\u{1F44E}\u{1F44F}\u{2B50}\u{1F3AF}]/gu, '\u2022');
}

function bodyBullets(body: string): string[] {
  return replaceEmojiBullets(body)
    .split(/(?:\r?\n\s*[\u2022\-]|\s+\u2022\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

// Each bullet is a single <Text> node (no per-character/per-line splits) so the
// exported text stays selectable and extracts as clean whole words.
function BulletedBody({
  body,
  palette,
  size = 36,
  bodyColor,
}: {
  body: string;
  palette: CarouselTemplateOption['palette'];
  size?: number;
  bodyColor?: string;
}) {
  const bullets = bodyBullets(body);
  if (bullets.length <= 1) {
    return (
      <Text
        style={{
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: size,
          lineHeight: 1.5,
          color: bodyColor || palette.foreground,
          width: CAROUSEL_PDF_CONTENT_WIDTH,
        }}
      >
        {replaceEmojiBullets(body)}
      </Text>
    );
  }
  return (
    <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, gap: 14, marginTop: 8 }}>
      {bullets.map((point, i) => (
        <View key={`b-${i}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: size, lineHeight: 1.5, color: palette.accent, width: 26, textAlign: 'center' }}>{'\u2022'}</Text>
          <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: size, lineHeight: 1.5, color: bodyColor || palette.foreground, flex: 1 }}>{point}</Text>
        </View>
      ))}
    </View>
  );
}

function Wordmark({ furniture }: { furniture: CarouselTemplateOption['furniture'] }) {
  return (
    <Text
      style={[styles.wordmark, { color: furniture.wordmarkColor, fontWeight: furniture.wordmarkWeight }]}
    >
      {furniture.wordmark}
    </Text>
  );
}

function Counter({
  index,
  total,
  palette,
  furniture,
}: {
  index: number;
  total: number;
  palette: CarouselTemplateOption['palette'];
  furniture: CarouselTemplateOption['furniture'];
}) {
  if (furniture.counter === 'strip') {
    return (
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.stripDot,
              {
                backgroundColor: i === index ? palette.accent : 'transparent',
                borderColor: i === index ? 'transparent' : palette.border,
                borderWidth: 1,
              },
            ]}
          />
        ))}
      </View>
    );
  }
  return (
    <Text
      style={[
        styles.counterPill,
        { backgroundColor: palette.chipBackground, color: palette.chipText },
      ]}
    >
      {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </Text>
  );
}

function HeaderRow({
  index,
  total,
  eyebrow,
  furniture,
  palette,
}: {
  index: number;
  total: number;
  eyebrow: string;
  furniture: CarouselTemplateOption['furniture'];
  palette: CarouselTemplateOption['palette'];
}) {
  const isSignature = furniture.counter === 'strip';
  return (
    <View style={styles.headerRow}>
      <View>
        <Wordmark furniture={furniture} />
        {eyebrow ? <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text> : null}
      </View>
      {isSignature ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Text style={[styles.handle, { color: furniture.footerColor }]}>@coach.kagiso</Text>
          <Counter index={index} total={total} palette={palette} furniture={furniture} />
        </View>
      ) : (
        <Counter index={index} total={total} palette={palette} furniture={furniture} />
      )}
    </View>
  );
}

function FooterRow({
  isLast,
  furniture,
  palette,
}: {
  isLast: boolean;
  furniture: CarouselTemplateOption['furniture'];
  palette: CarouselTemplateOption['palette'];
}) {
  const isSignature = furniture.counter === 'strip';
  return (
    <View style={styles.footerRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.footerDash, { backgroundColor: furniture.footerDash }]} />
        <Text style={[styles.footerLabel, { color: furniture.footerColor }]}>{furniture.footerLeft}</Text>
      </View>
      {isSignature ? null : isLast ? (
        <Text style={[styles.handle, { color: furniture.footerColor }]}>{furniture.footerRightLast}</Text>
      ) : (
        <Text style={[styles.handle, { color: furniture.footerColor }]}>{furniture.footerRight}</Text>
      )}
      {furniture.swipeCue && !isLast ? (
        <Text style={[styles.handle, { color: palette.muted }]}>SWIPE</Text>
      ) : null}
    </View>
  );
}

function CoverCard({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  return (
    <>
      <Text
        style={[
          styles.headline,
          { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground },
        ]}
      >
        {item.slide.headline}
      </Text>
      <View style={{ height: 8, width: 120, backgroundColor: palette.accent, borderRadius: 2, marginTop: 32 }} />
      {item.slide.body ? (
        <Text
          style={{
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.5,
            marginTop: 24,
            color: palette.foreground,
            width: CAROUSEL_PDF_CONTENT_WIDTH,
          }}
        >
          {replaceEmojiBullets(item.slide.body)}
        </Text>
      ) : null}
    </>
  );
}

function QuotePanel({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>{item.slide.headline}</Text>
      <View
        style={{
          marginTop: 24,
          width: CAROUSEL_PDF_CONTENT_WIDTH,
          backgroundColor: '#FFFFFF',
          borderLeftWidth: 4,
          borderLeftColor: palette.accent,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          paddingVertical: 48,
          paddingLeft: 56,
          paddingRight: 56,
        }}
      >
        <Text style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 64, color: palette.accent, lineHeight: 1.05 }}>
          {String.fromCharCode(0x201c)}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.5,
            color: palette.foreground,
            width: 772,
            marginTop: 16,
          }}
        >
          {replaceEmojiBullets(item.slide.body || '')}
        </Text>
      </View>
    </>
  );
}

function NumberedStack({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  const points = bodyBullets(item.slide.body) || [item.slide.body];
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, gap: 40 }}>
        {points.map((point, i) => {
          const [titleLine, ...rest] = point.split('\n');
          return (
            <View key={`n-${i}`} style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start', width: '100%' }}>
              <Text style={{ fontFamily: 'Playfair Display', fontWeight: 600, fontSize: 40, color: palette.accent, width: 48, textAlign: 'center' }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 36, lineHeight: 1.4, color: palette.foreground, flex: 1 }}>
                {titleLine}
              </Text>
              {rest.length > 0 ? (
                <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 28, lineHeight: 1.4, color: palette.muted, flex: 1 }}>
                  {rest.join(' ').trim()}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </>
  );
}

function CardGrid({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  const points = bodyBullets(item.slide.body) || [item.slide.body];
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, flexDirection: 'row', gap: 32, flexWrap: 'wrap' }}>
        {points.slice(0, 4).map((point, i) => (
          <View
            key={`g-${i}`}
            style={{
              width: 428,
              backgroundColor: i % 2 === 0 ? '#FFFFFF' : palette.panel,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 32,
            }}
          >
            <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 34, color: palette.foreground, marginBottom: 8 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 28, lineHeight: 1.4, color: palette.muted, width: 364 }}>
              {replaceEmojiBullets(point)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ContrastBlock({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 32 }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 22, color: palette.muted, letterSpacing: 0.14 * 22, textTransform: 'uppercase' }}>Old frame</Text>
          <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 36, marginTop: 12, lineHeight: 1.5, color: palette.foreground, width: '100%' }}>{item.slide.body || ''}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: palette.accent, borderRadius: 16, padding: 32 }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 22, color: '#142334', letterSpacing: 0.14 * 22, textTransform: 'uppercase' }}>Sharper frame</Text>
          <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 36, marginTop: 12, lineHeight: 1.5, color: '#142334', width: '100%' }}>{item.slide.cta || item.slide.body || ''}</Text>
        </View>
      </View>
    </>
  );
}

function EvidenceCard({
  item,
  palette,
  composition,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  composition: string;
}) {
  const label = composition === 'example_note' ? 'Example' : 'Why it holds';
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <View style={{ width: 24, height: 4, backgroundColor: palette.accent, borderRadius: 2 }} />
        <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 22, color: palette.accent, letterSpacing: 0.14 * 22, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      <BulletedBody body={item.slide.body} palette={palette} size={36} />
    </>
  );
}

function NoteCard({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 28, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 32, backgroundColor: palette.panel }}>
        <BulletedBody body={item.slide.body} palette={palette} size={36} />
      </View>
    </>
  );
}

function SoftReflection({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 500, fontStyle: 'italic', color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 24 }}>
        <BulletedBody body={item.slide.body} palette={palette} size={36} />
      </View>
      {item.slide.cta ? (
        <Text style={[styles.handle, { marginTop: 20, color: palette.accent }]}>{item.slide.cta}</Text>
      ) : null}
    </>
  );
}

function DirectAction({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  const bullets = bodyBullets(item.slide.body) || [item.slide.body];
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 700, color: '#FFFFFF' }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, gap: 14 }}>
        {bullets.map((point, i) => (
          <View key={`d-${i}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 32, lineHeight: 1.4, color: palette.accent }}>{'\u2022'}</Text>
            <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 36, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)', flex: 1 }}>{point}</Text>
          </View>
        ))}
      </View>
      {item.slide.cta ? (
        <View style={{ marginTop: 32, backgroundColor: '#142334', borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 48, alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 32, color: '#FFFFFF', letterSpacing: 0.12 * 32, textTransform: 'uppercase' }}>{item.slide.cta}</Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 30, lineHeight: 1.45, marginTop: 8, color: 'rgba(255,255,255,0.72)' }}>@coach.kagiso</Text>
    </>
  );
}

function SaveShareClose({
  item,
  palette,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
}) {
  const tags = ['Save', 'Share', 'Apply'];
  return (
    <>
      <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 700, color: palette.foreground }]}>
        {item.slide.headline}
      </Text>
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, gap: 20 }}>
        {tags.map((t) => (
          <View
            key={t}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 40,
              paddingHorizontal: 24,
              paddingVertical: 12,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 28,
                color: palette.foreground,
                letterSpacing: 0.14 * 28,
                textTransform: 'uppercase',
              }}
            >
              {t}
            </Text>
          </View>
        ))}
      </View>
      {item.slide.body ? <BulletedBody body={item.slide.body} palette={palette} size={36} /> : null}
    </>
  );
}

function SlideContent({
  item,
  palette,
  furniture,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  furniture: CarouselTemplateOption['furniture'];
}) {
  const composition = resolveComposition(item.slide);
  switch (composition) {
    case 'bold_claim':
    case 'quiet_intro':
    case 'editorial_cover':
      return <CoverCard item={item} palette={palette} />;
    case 'quote_panel':
      return <QuotePanel item={item} palette={palette} />;
    case 'numbered_stack':
      return <NumberedStack item={item} palette={palette} />;
    case 'card_grid':
      return <CardGrid item={item} palette={palette} />;
    case 'contrast_block':
    case 'side_rail':
      return <ContrastBlock item={item} palette={palette} />;
    case 'evidence_card':
    case 'example_note':
    case 'credibility_cue':
      return <EvidenceCard item={item} palette={palette} composition={composition} />;
    case 'note_card':
      return <NoteCard item={item} palette={palette} />;
    case 'soft_reflection':
      return <SoftReflection item={item} palette={palette} />;
    case 'direct_action':
      return <DirectAction item={item} palette={palette} />;
    case 'save_share_close':
      return <SaveShareClose item={item} palette={palette} />;
    default:
      return (
        <>
          <Text style={[styles.headline, { fontSize: item.headlineSize, fontWeight: 600, color: palette.foreground }]}>
            {item.slide.headline}
          </Text>
          {item.slide.body ? <BulletedBody body={item.slide.body} palette={palette} size={36} /> : null}
        </>
      );
  }
}

export function CarouselPdfDocument({ deck, template }: CarouselPdfProps) {
  const { palette, furniture } = template;
  return (
    <Document>
      {deck.map((item, index) => {
        const isLast = index === deck.length - 1;
        return (
          <Page
            key={`pdf-${item.slide.id}-${index}`}
            style={[
              styles.page,
              {
                backgroundColor: palette.background,
                color: palette.foreground,
              },
            ]}
          >
            <HeaderRow index={index} total={deck.length} eyebrow={item.eyebrow} furniture={furniture} palette={palette} />
            <View style={{ flex: 1, marginTop: 20, justifyContent: 'center' }}>
              <SlideContent item={item} palette={palette} furniture={furniture} />
            </View>
            <FooterRow isLast={isLast} furniture={furniture} palette={palette} />
          </Page>
        );
      })}
    </Document>
  );
}
