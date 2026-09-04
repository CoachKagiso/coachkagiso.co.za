import React from 'react';
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { getSiteUrl } from '@/lib/env';
import type { CarouselTemplateOption } from '@/lib/content/carousel-template-registry';
import {
  EditorialAuthorityPdfContent,
  editorialPdfPagePadding,
  resolveEditorialPdfLayout,
} from './EditorialAuthorityPdfPage';
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
// Editorial Authority sets its type in Poppins. Same self-hosted TTF path as
// the others so the vector lane never reaches for a Google Fonts CSS file it
// cannot parse, and so the widths match the ones the type fit measured.
Font.register({ family: 'Poppins', fontWeight: 400, src: FONT('Poppins-Regular.ttf') });
Font.register({ family: 'Poppins', fontWeight: 500, src: FONT('Poppins-Medium.ttf') });
Font.register({ family: 'Poppins', fontWeight: 600, src: FONT('Poppins-SemiBold.ttf') });
Font.register({ family: 'Poppins', fontWeight: 700, src: FONT('Poppins-Bold.ttf') });
// Real italics, because a slide can now carry them. Synthesised obliques are
// not an option here: @react-pdf draws the upright face when it has no italic.
Font.register({ family: 'Poppins', fontWeight: 400, fontStyle: 'italic', src: FONT('Poppins-Italic.ttf') });
Font.register({ family: 'Poppins', fontWeight: 700, fontStyle: 'italic', src: FONT('Poppins-BoldItalic.ttf') });
// The slide counter. One weight is all Bebas Neue ships.
Font.register({ family: 'Bebas Neue', fontWeight: 400, src: FONT('BebasNeue-Regular.ttf') });

// Disable hyphenation so text wraps at word boundaries only and no mid-word
// hyphens appear in the exported PDF.
//
// The callback must hand the word back as a single part. It previously returned
// `['']` - an array holding an empty string - which is not "do not split this
// word", it is "this word is nothing". Every word in the document became empty,
// so the PDF exported with its layout, icons and avatar intact and not one
// glyph of text on it.
try {
  Font.registerHyphenationCallback((word) => [word]);
} catch {
  // registerHyphenationCallback is opt-in on supported versions; ignore if absent.
}

/**
 * The page, in points, passed to every `<Page>` as its `size` prop.
 *
 * It has to be the prop: width and height set only in `styles.page` are content
 * box styles, and react-pdf still lays the page out at its A4 default. Every
 * export came out 595pt wide with a height that grew or shrank to fit whatever
 * was on it, so no two slides in a deck were the same shape.
 *
 * Not paired with `wrap={false}`, tempting as that is for a format where one
 * slide is one page: it makes the page shrink to its content instead, which
 * gives back the ragged heights this prop exists to fix. Keeping a slide on one
 * page is the type fit's job, and the fit guarantees the content fits the band.
 */
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
  profilePhotoUrl?: string | null;
};

// Editorial Authority renders **bold** spans as strong runs, mirroring the
// HTML preview so the reference look survives in the vector PDF.
function RichPdfText({ text, strongWeight = 700 }: { text: string; strongWeight?: number }) {
  const parts = text.split(/\*\*(.+?)\*\*/g).filter((part) => part !== '');
  if (parts.length <= 1) return <Text>{text}</Text>;
  return (
    <Text>
      {parts.map((part, partIndex) =>
        partIndex % 2 === 1 ? (
          <Text key={`rich-${partIndex}`} style={{ fontWeight: strongWeight }}>
            {part}
          </Text>
        ) : (
          <Text key={`rich-${partIndex}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

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

function headlineFont(templateValue: CarouselTemplateOption['value']) {
  return templateValue === 'editorial_authority' ? 'Inter' : 'Playfair Display';
}

function Headline({
  item,
  palette,
  templateValue,
  weight = 600,
  italic = false,
  color,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
  weight?: number;
  italic?: boolean;
  color?: string;
}) {
  const isEditorialAuthority = templateValue === 'editorial_authority';
  return (
    <Text
      style={[
        styles.headline,
        {
          fontSize: item.headlineSize,
          fontWeight: isEditorialAuthority ? 400 : weight,
          fontStyle: isEditorialAuthority ? 'normal' : italic ? 'italic' : 'normal',
          color: color || palette.foreground,
          fontFamily: headlineFont(templateValue),
        },
      ]}
    >
      {isEditorialAuthority ? <RichPdfText text={item.slide.headline} /> : item.slide.headline}
    </Text>
  );
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
  templateValue,
  profilePhotoUrl,
}: {
  index: number;
  total: number;
  eyebrow: string;
  furniture: CarouselTemplateOption['furniture'];
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
  profilePhotoUrl?: string | null;
}) {
  const isSignature = furniture.counter === 'strip' && templateValue !== 'editorial_authority';
  const isEditorialAuthority = templateValue === 'editorial_authority';
  if (isEditorialAuthority) {
    return (
      <View style={{ width: '100%', gap: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
              <Text
                key={`progress-${i}`}
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 24,
                  letterSpacing: 0.05 * 24,
                  color: i === index ? '#B9927A' : '#B9B0A8',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Text>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          {profilePhotoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop; the handle text beside it names the avatar.
            <Image
              src={profilePhotoUrl}
              style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#B76E79', objectFit: 'cover' }}
            />
          ) : (
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#E4D8CB' }} />
          )}
          <View>
            <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 30, letterSpacing: 0.12 * 30, color: '#B9927A', textTransform: 'uppercase' }}>
              COACHKAGISO
            </Text>
            <Text style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 30, color: '#B9927A', marginTop: 4 }}>
              @coach.kagiso
            </Text>
          </View>
        </View>
      </View>
    );
  }
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
  templateValue,
}: {
  isLast: boolean;
  furniture: CarouselTemplateOption['furniture'];
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const isSignature = furniture.counter === 'strip' && templateValue !== 'editorial_authority';
  if (templateValue === 'editorial_authority') {
    return (
      <View style={styles.footerRow}>
        <Text style={[styles.footerLabel, { color: '#B9927A' }]}>COACHKAGISO</Text>
        <Text style={[styles.handle, { color: '#B9927A' }]}>SWIPE</Text>
      </View>
    );
  }
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const isEditorialAuthority = templateValue === 'editorial_authority';
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
      {isEditorialAuthority ? null : (
        <View style={{ height: 8, width: 120, backgroundColor: palette.accent, borderRadius: 2, marginTop: 32 }} />
      )}
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
          {isEditorialAuthority ? <RichPdfText text={replaceEmojiBullets(item.slide.body)} /> : replaceEmojiBullets(item.slide.body)}
        </Text>
      ) : null}
    </>
  );
}

function QuotePanel({
  item,
  palette,
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const points = bodyBullets(item.slide.body) || [item.slide.body];
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const points = bodyBullets(item.slide.body) || [item.slide.body];
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  composition: string;
  templateValue: CarouselTemplateOption['value'];
}) {
  const label = composition === 'example_note' ? 'Example' : 'Why it holds';
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} />
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 28, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 32, backgroundColor: palette.panel }}>
        <BulletedBody body={item.slide.body} palette={palette} size={36} />
      </View>
    </>
  );
}

function SoftReflection({
  item,
  palette,
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} weight={500} italic />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const bullets = bodyBullets(item.slide.body) || [item.slide.body];
  // DirectAction is white-on-dark for bold_diagnostic; on the light Editorial
  // Authority paper it renders in ink so the CTA stays readable.
  const isEditorialAuthority = templateValue === 'editorial_authority';
  const actionInk = isEditorialAuthority ? palette.foreground : '#FFFFFF';
  const actionSoft = isEditorialAuthority ? palette.foreground : 'rgba(255,255,255,0.88)';
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} weight={700} color={actionInk} />
      <View style={{ width: CAROUSEL_PDF_CONTENT_WIDTH, marginTop: 32, gap: 14 }}>
        {bullets.map((point, i) => (
          <View key={`d-${i}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 32, lineHeight: 1.4, color: palette.accent }}>{'\u2022'}</Text>
            <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 36, lineHeight: 1.45, color: actionSoft, flex: 1 }}>{point}</Text>
          </View>
        ))}
      </View>
      {item.slide.cta ? (
        <View style={{ marginTop: 32, backgroundColor: '#142334', borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 48, alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 32, color: '#FFFFFF', letterSpacing: 0.12 * 32, textTransform: 'uppercase' }}>{item.slide.cta}</Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 30, lineHeight: 1.45, marginTop: 8, color: isEditorialAuthority ? palette.muted : 'rgba(255,255,255,0.72)' }}>@coach.kagiso</Text>
    </>
  );
}

function SaveShareClose({
  item,
  palette,
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const tags = ['Save', 'Share', 'Apply'];
  return (
    <>
      <Headline item={item} palette={palette} templateValue={templateValue} weight={700} />
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
  templateValue,
}: {
  item: CarouselPdfSlide;
  palette: CarouselTemplateOption['palette'];
  furniture: CarouselTemplateOption['furniture'];
  templateValue: CarouselTemplateOption['value'];
}) {
  const composition = resolveComposition(item.slide);
  switch (composition) {
    case 'bold_claim':
    case 'quiet_intro':
    case 'editorial_cover':
      return <CoverCard item={item} palette={palette} templateValue={templateValue} />;
    case 'quote_panel':
      return <QuotePanel item={item} palette={palette} templateValue={templateValue} />;
    case 'numbered_stack':
      return <NumberedStack item={item} palette={palette} templateValue={templateValue} />;
    case 'card_grid':
      return <CardGrid item={item} palette={palette} templateValue={templateValue} />;
    case 'contrast_block':
    case 'side_rail':
      return <ContrastBlock item={item} palette={palette} templateValue={templateValue} />;
    case 'evidence_card':
    case 'example_note':
    case 'credibility_cue':
      return <EvidenceCard item={item} palette={palette} composition={composition} templateValue={templateValue} />;
    case 'note_card':
      return <NoteCard item={item} palette={palette} templateValue={templateValue} />;
    case 'soft_reflection':
      return <SoftReflection item={item} palette={palette} templateValue={templateValue} />;
    case 'direct_action':
      return <DirectAction item={item} palette={palette} templateValue={templateValue} />;
    case 'save_share_close':
      return <SaveShareClose item={item} palette={palette} templateValue={templateValue} />;
    default:
      return (
        <>
          <Headline item={item} palette={palette} templateValue={templateValue} />
          {item.slide.body ? <BulletedBody body={item.slide.body} palette={palette} size={36} /> : null}
        </>
      );
  }
}

export function CarouselPdfDocument({
  deck,
  template,
  profilePhotoUrl,
  trailingPages,
}: CarouselPdfProps & { trailingPages?: React.ReactNode }) {
  const { palette, furniture } = template;
  return (
    <Document>
      {deck.map((item, index) => {
        const isLast = index === deck.length - 1;

        // Editorial Authority does not use the header/content/footer split. Its
        // avatar belongs to the centred group rather than the pinned header, and
        // it draws no composition panels, so it takes the page for itself and
        // reads its geometry from the same layout function the preview uses.
        if (template.value === 'editorial_authority') {
          const layout = resolveEditorialPdfLayout(item.slide, item.role, CAROUSEL_PDF_PAGE);
          return (
            <Page
              key={`pdf-${item.slide.id}-${index}`}
              size={CAROUSEL_PDF_PAGE}
              style={[
                styles.page,
                {
                  backgroundColor: palette.background,
                  color: palette.foreground,
                  paddingVertical: undefined,
                  paddingHorizontal: undefined,
                },
                editorialPdfPagePadding(layout),
              ]}
            >
              <EditorialAuthorityPdfContent
                slide={item.slide}
                index={index}
                total={deck.length}
                layout={layout}
                palette={palette}
                profilePhotoUrl={profilePhotoUrl}
              />
            </Page>
          );
        }

        return (
          <Page
            key={`pdf-${item.slide.id}-${index}`}
            size={CAROUSEL_PDF_PAGE}
            style={[
              styles.page,
              {
                backgroundColor: palette.background,
                color: palette.foreground,
              },
            ]}
          >
            <HeaderRow index={index} total={deck.length} eyebrow={item.eyebrow} furniture={furniture} palette={palette} templateValue={template.value} profilePhotoUrl={profilePhotoUrl} />
            <View style={{ flex: 1, marginTop: 20, justifyContent: 'center' }}>
              <SlideContent item={item} palette={palette} furniture={furniture} templateValue={template.value} />
            </View>
            <FooterRow isLast={isLast} furniture={furniture} palette={palette} templateValue={template.value} />
          </Page>
        );
      })}
      {/* CHANGE W: a custom CTA slide is a design document, not a carousel
          slide. Appending its already-built vector pages here keeps the whole
          deck in one PDF without merging two files or rasterising either. */}
      {trailingPages}
    </Document>
  );
}
