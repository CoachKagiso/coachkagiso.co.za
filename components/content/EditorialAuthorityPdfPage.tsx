import React from 'react';
import { Circle, Image, Path, Rect, Svg, Text, View } from '@react-pdf/renderer';
import type { CarouselTemplateOption } from '@/lib/content/carousel-template-registry';
import {
  CAROUSEL_EDITORIAL_WORDMARK,
  carouselEditorialMetrics,
  editorialIdentityLift,
  layoutEditorialAuthoritySlide,
  type CarouselEditorialLayout,
} from '@/lib/content/carousel-editorial-layout';
import { SWIPE_ICON_PATHS, SWIPE_ICON_VIEW_BOX } from '@/lib/content/carousel-swipe-icon';
import type { CarouselSlide } from './ContentStudio';

/**
 * Editorial Authority as a vector page.
 *
 * The counterpart to `EditorialAuthoritySlide`, and deliberately the same
 * shape: one pinned band at the top, one at the bottom, and a group between
 * them with auto margins so it centres itself and lifts the avatar as copy
 * grows. Both lanes take their geometry and their fitted type sizes from
 * `layoutEditorialAuthoritySlide`, which is what keeps the PDF and the PNG the
 * same slide rather than two interpretations of one.
 *
 * The PDF renders at 1080 wide, which is the layout module's base space, so
 * every number here is used unscaled.
 */

const ICON_STROKE = '#142334';

/**
 * The four utility marks from the reference slide.
 *
 * Redrawn as Svg because @react-pdf cannot render the lucide React components
 * the preview uses. Path data is copied from lucide (ISC) at the same 24-unit
 * grid, so the two lanes draw the same glyphs.
 */
function UtilityIcons({ size }: { size: number }) {
  const common = {
    stroke: ICON_STROKE,
    strokeWidth: 1.8,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const dotSize = size * 0.38;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.84 }}>
      <View style={{ position: 'relative' }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" {...common} />
          <Rect x="2" y="4" width="20" height="16" rx="2" {...common} />
        </Svg>
        <View
          style={{
            backgroundColor: '#C9AD98',
            borderRadius: dotSize / 2,
            height: dotSize,
            position: 'absolute',
            right: -dotSize * 0.2,
            top: -dotSize * 0.2,
            width: dotSize,
          }}
        />
      </View>

      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M10 11v6" {...common} />
        <Path d="M14 11v6" {...common} />
        <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" {...common} />
        <Path d="M3 6h18" {...common} />
        <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...common} />
      </Svg>

      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3v12" {...common} />
        <Path d="m17 8-5-5-5 5" {...common} />
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...common} />
      </Svg>

      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="1.4" fill={ICON_STROKE} />
        <Circle cx="19" cy="12" r="1.4" fill={ICON_STROKE} />
        <Circle cx="5" cy="12" r="1.4" fill={ICON_STROKE} />
      </Svg>
    </View>
  );
}

/**
 * Design Studio's "Swipe left icon", the same geometry the preview draws.
 *
 * A filled mark rather than a stroked one, so it takes a fill and no stroke -
 * the lucide hand it replaced was the other way round.
 */
function SwipeMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={SWIPE_ICON_VIEW_BOX}>
      {SWIPE_ICON_PATHS.map((d) => (
        <Path key={d.slice(0, 24)} d={d} fill="#B76E79" />
      ))}
    </Svg>
  );
}

/** `**key phrase**` becomes a heavier run, matching the preview's rich text. */
function RichText({ text }: { text: string }) {
  const parts = String(text ?? '').split(/\*\*(.+?)\*\*/g).filter((part) => part !== '');
  if (parts.length <= 1) return <Text>{text}</Text>;
  return (
    <Text>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text key={`strong-${index}`} style={{ fontWeight: 700 }}>
            {part}
          </Text>
        ) : (
          <Text key={`plain-${index}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export function resolveEditorialPdfLayout(
  slide: CarouselSlide,
  role: CarouselSlide['role'],
  page: { width: number; height: number },
): CarouselEditorialLayout {
  return layoutEditorialAuthoritySlide({
    headline: slide.headline,
    body: slide.body,
    isCover: role === 'cover',
    width: page.width,
    height: page.height,
  });
}

/** Page padding for an Editorial Authority page, straight from the layout. */
export function editorialPdfPagePadding(layout: CarouselEditorialLayout) {
  return {
    paddingTop: layout.padTop * layout.scale,
    paddingBottom: layout.padBottom * layout.scale,
    paddingHorizontal: layout.padX * layout.scale,
  };
}

export function EditorialAuthorityPdfContent({
  slide,
  index,
  total,
  layout,
  palette,
  profilePhotoUrl,
}: {
  slide: CarouselSlide;
  index: number;
  total: number;
  layout: CarouselEditorialLayout;
  palette: CarouselTemplateOption['palette'];
  profilePhotoUrl?: string | null;
}) {
  const m = carouselEditorialMetrics;
  const size = (base: number) => base * layout.scale;
  // Shared with the preview, so the two lanes cannot disagree about whether
  // this body is a list - which would leave one of them measured wrong.
  const { bodyPoints, bodyAsList } = layout;
  const footerRowHeight = Math.max(m.footerFontSize * m.footerLineHeight, m.swipeIconSize);

  return (
    <>
      {/* Pinned: progress strip over the utility icons, right aligned. */}
      <View style={{ alignItems: 'flex-end', gap: size(m.progressRowGap) }}>
        <View style={{ flexDirection: 'row', gap: size(m.progressGap) }}>
          {Array.from({ length: total }).map((_, progressIndex) => (
            <Text
              key={`progress-${progressIndex}`}
              style={{
                color: progressIndex === index ? '#B9927A' : '#B9B0A8',
                fontFamily: 'Bebas Neue',
                fontSize: size(m.progressFontSize),
                fontWeight: 400,
                letterSpacing: size(m.progressFontSize * m.numeralTracking),
                // Explicit, because the layout reserves this much for the top
                // band. Left off, the preview inherited the app's leading and
                // made the band taller than the band the group was fitted to.
                lineHeight: m.progressLineHeight,
              }}
            >
              {String(progressIndex + 1).padStart(2, '0')}
            </Text>
          ))}
        </View>
        <UtilityIcons size={size(m.iconSize)} />
      </View>

      {/*
        The centred group.

        `flex: 1` plus `justifyContent: center` rather than the auto margins the
        preview uses. Yoga resolves auto margins here against an unbounded
        height, which pushed the type off the page entirely and spilled a
        four-slide deck onto five pages - a blank-looking PDF with the icons
        still on it. This gives the same result the browser gets: the group
        takes the space between the pinned rows and centres itself inside it.
      */}
      <View style={{ flex: 1, justifyContent: 'center', width: '100%' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: size(m.avatarTextGap) }}>
          {profilePhotoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop; the handle beside it names the avatar.
            <Image
              src={profilePhotoUrl}
              style={{
                borderColor: '#B76E79',
                borderRadius: size(m.avatarSize) / 2,
                borderWidth: size(3),
                height: size(m.avatarSize),
                objectFit: 'cover',
                width: size(m.avatarSize),
              }}
            />
          ) : (
            <View
              style={{
                backgroundColor: '#E4D8CB',
                borderRadius: size(m.avatarSize) / 2,
                height: size(m.avatarSize),
                width: size(m.avatarSize),
              }}
            />
          )}
          <View
            style={{
              gap: size(m.identityLineGap),
              // See the note in EditorialAuthoritySlide: centres the ink, not
              // the boxes. Yoga centres the margin box the same way CSS does.
              marginBottom: size(editorialIdentityLift('pdf') * 2),
            }}
          >
            <Text
              style={{
                color: '#B9927A',
                fontFamily: 'Poppins',
                fontSize: size(m.identityFontSize),
                fontWeight: m.wordmarkLightWeight,
                letterSpacing: size(m.identityFontSize * 0.12),
                lineHeight: m.identityLineHeight,
                textTransform: 'uppercase',
              }}
            >
              {CAROUSEL_EDITORIAL_WORDMARK.light}
              <Text style={{ fontWeight: m.wordmarkBoldWeight }}>
                {CAROUSEL_EDITORIAL_WORDMARK.bold}
              </Text>
            </Text>
            <Text
              style={{
                color: '#B9927A',
                fontFamily: 'Poppins',
                fontSize: size(m.handleFontSize),
                fontWeight: 500,
                lineHeight: m.identityLineHeight,
              }}
            >
              @coach.kagiso
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: palette.foreground,
            fontFamily: 'Poppins',
            fontSize: size(layout.headlineSize),
            fontWeight: 400,
            lineHeight: m.headlineLineHeight,
            marginTop: size(m.groupGap),
          }}
        >
          <RichText text={slide.headline} />
        </Text>

        {slide.body ? (
          bodyAsList ? (
            <View style={{ marginTop: size(m.bodyGap) }}>
              {bodyPoints.map((point, pointIndex) => (
                <Text
                  key={`${slide.id}-line-${pointIndex}`}
                  style={{
                    color: palette.foreground,
                    fontFamily: 'Poppins',
                    fontSize: size(layout.bodySize),
                    fontWeight: 400,
                    lineHeight: m.bodyLineHeight,
                    marginTop: pointIndex ? size(m.bodyItemGap) : 0,
                  }}
                >
                  <RichText text={point} />
                </Text>
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: palette.foreground,
                fontFamily: 'Poppins',
                fontSize: size(layout.bodySize),
                fontWeight: 400,
                lineHeight: m.bodyLineHeight,
                marginTop: size(m.bodyGap),
              }}
            >
              <RichText text={slide.body} />
            </Text>
          )
        ) : null}

        {slide.cta ? (
          <Text
            style={{
              color: palette.accent,
              fontFamily: 'Poppins',
              fontSize: size(24),
              fontWeight: 700,
              letterSpacing: size(24 * 0.14),
              marginTop: size(m.bodyGap),
              textTransform: 'uppercase',
            }}
          >
            {slide.cta}
          </Text>
        ) : null}

        {slide.footnote ? (
          <Text
            style={{
              color: palette.muted,
              fontFamily: 'Poppins',
              fontSize: size(22),
              fontWeight: 400,
              marginTop: size(16),
            }}
          >
            {slide.footnote}
          </Text>
        ) : null}
      </View>

      {/* Pinned: wordmark left, swipe cue right, both centred in one row height. */}
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          height: size(footerRowHeight),
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: '#B9927A',
            fontFamily: 'Poppins',
            fontSize: size(m.footerFontSize),
            fontWeight: m.wordmarkLightWeight,
            letterSpacing: size(m.footerFontSize * 0.12),
            lineHeight: m.footerLineHeight,
            textTransform: 'uppercase',
          }}
        >
          {CAROUSEL_EDITORIAL_WORDMARK.light}
          <Text style={{ fontWeight: m.wordmarkBoldWeight }}>
            {CAROUSEL_EDITORIAL_WORDMARK.bold}
          </Text>
        </Text>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: size(10) }}>
          <Text
            style={{
              color: '#B9927A',
              fontFamily: 'Poppins',
              fontSize: size(m.footerFontSize),
              fontWeight: 700,
              letterSpacing: size(m.footerFontSize * 0.1),
              lineHeight: m.footerLineHeight,
              textTransform: 'uppercase',
            }}
          >
            SWIPE
          </Text>
          <SwipeMark size={size(m.swipeIconSize)} />
        </View>
      </View>
    </>
  );
}
