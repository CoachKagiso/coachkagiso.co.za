'use client';

import React, { type ReactNode } from 'react';
import { Mail, MoreHorizontal, Trash2, Upload } from 'lucide-react';
import {
  CAROUSEL_EXPORT_FONT_BEBAS,
  CAROUSEL_EXPORT_FONT_POPPINS,
  type CarouselTemplateOption,
} from '@/lib/content/carousel-template-registry';
import {
  CAROUSEL_EDITORIAL_WORDMARK,
  carouselEditorialMetrics,
  editorialIconDrop,
  editorialIconViewBox,
  editorialIdentityLift,
  type CarouselEditorialLayout,
} from '@/lib/content/carousel-editorial-layout';
import {
  SWIPE_ICON_COLOR,
  SWIPE_ICON_PATHS,
  SWIPE_ICON_VIEW_BOX,
} from '@/lib/content/carousel-swipe-icon';
import type { CarouselSlide } from './ContentStudio';

/**
 * Editorial Authority, drawn as one piece.
 *
 * The other five templates share `CarouselSlideFrame`'s three-branch body
 * (cover / cta / everything else) and its composition panels. This one does
 * not, for two reasons the reference look depends on:
 *
 * 1. The avatar and handle belong to the centred group, not the pinned header.
 *    Sitting in the header glued them to the top of the slide beside the
 *    progress strip, half a page from the headline they are meant to sign.
 *    Here the only pinned rows are the progress strip, the icon row and the
 *    footer; everything else is one block with auto margins, so longer copy
 *    grows the group around its centre and lifts the avatar rather than
 *    leaving a hole in the middle of the slide.
 *
 * 2. There are no panels. Card grids, quote rails, evidence boxes and their
 *    "Why it holds" labels all read as UI chrome on a template whose whole
 *    argument is flat type on paper. Every composition renders as type here.
 *
 * Geometry and type sizes come from `layoutEditorialAuthoritySlide` rather than
 * from this file, so the react-pdf lane can compute exactly the same slide
 * server-side where there is no DOM to measure in.
 */
export function EditorialAuthoritySlide({
  slide,
  index,
  total,
  layout,
  palette,
  avatarSrc,
  renderRichText,
}: {
  slide: CarouselSlide;
  index: number;
  total: number;
  layout: CarouselEditorialLayout;
  palette: CarouselTemplateOption['palette'];
  avatarSrc: string;
  renderRichText: (text: string, strongWeight?: number) => ReactNode[];
}) {
  const m = carouselEditorialMetrics;
  /** Base-space (1080-wide) value to a rendered pixel string. */
  const px = (base: number) => `${Math.round(base * layout.scale * 100) / 100}px`;
  const font = CAROUSEL_EXPORT_FONT_POPPINS;
  const numeralFont = CAROUSEL_EXPORT_FONT_BEBAS;
  // Whether the body sets as separate lines is decided by the layout, not here:
  // a list carries a gap between its items, and that gap is part of the height
  // the type fit measured against.
  const { bodyPoints, bodyAsList } = layout;
  const iconStyle = { color: '#142334', height: px(m.iconSize), width: px(m.iconSize) };
  // The envelope drops by this many grid units to reach the shared line; the
  // badge has to travel with it.
  const mailBadgeTop = (editorialIconDrop('mail') / 24) * m.iconSize - 3;
  const footerRowHeight = Math.max(m.footerFontSize * m.footerLineHeight, m.swipeIconSize);
  const bodyStyle = {
    color: palette.foreground,
    fontFamily: font,
    fontSize: px(layout.bodySize),
    fontWeight: 400,
    lineHeight: m.bodyLineHeight,
  } as const;

  return (
    <>
      {/* Pinned: progress strip over the utility icons, right aligned. */}
      <div
        style={{
          alignItems: 'flex-end',
          display: 'flex',
          flexDirection: 'column',
          gap: px(m.progressRowGap),
        }}
      >
        <div
          // The export clone forces Poppins onto every span in this template, so
          // the numerals carry a marker the Bebas rule can target after it.
          data-carousel-numerals="true"
          style={{ display: 'flex', gap: px(m.progressGap) }}
          aria-label={`Slide ${index + 1} of ${total}`}
        >
          {Array.from({ length: total }, (_, progressIndex) => (
            <span
              key={`progress-${progressIndex}`}
              style={{
                color: progressIndex === index ? '#B9927A' : '#B9B0A8',
                fontFamily: numeralFont,
                fontSize: px(m.progressFontSize),
                fontWeight: 400,
                letterSpacing: px(m.progressFontSize * m.numeralTracking),
                // Explicit, because the layout reserves this much for the top
                // band. Left off, the preview inherited the app's leading and
                // made the band taller than the band the group was fitted to.
                lineHeight: m.progressLineHeight,
              }}
            >
              {String(progressIndex + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
        {/*
          The viewBox on each mark is shifted so their ink ends on one line.
          Bottom-aligning the boxes would do nothing - they are all the same
          size already; it is the glyphs inside that sat on different lines.
        */}
        <div style={{ alignItems: 'center', display: 'flex', gap: px(30) }} aria-hidden="true">
          <span style={{ display: 'inline-flex', position: 'relative' }}>
            <Mail style={iconStyle} strokeWidth={1.8} viewBox={editorialIconViewBox('mail')} />
            <span
              style={{
                backgroundColor: '#C9AD98',
                borderRadius: '9999px',
                height: px(14),
                position: 'absolute',
                right: `-${px(3)}`,
                // Follows the envelope down, or it detaches from the corner it
                // is meant to sit on.
                top: px(mailBadgeTop),
                width: px(14),
              }}
            />
          </span>
          <Trash2 style={iconStyle} strokeWidth={1.8} viewBox={editorialIconViewBox('trash')} />
          <Upload style={iconStyle} strokeWidth={1.8} viewBox={editorialIconViewBox('upload')} />
          <MoreHorizontal style={iconStyle} strokeWidth={2} />
        </div>
      </div>

      {/* The centred group. The auto margins are what lift the avatar as copy grows. */}
      <div style={{ margin: 'auto 0', width: '100%' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: px(m.avatarTextGap) }}>
          {/* Plain img (not next/image) so html2canvas captures it in PNG export. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt="Coach Kagiso"
            crossOrigin="anonymous"
            style={{
              border: `${px(3)} solid #B76E79`,
              borderRadius: '9999px',
              height: px(m.avatarSize),
              objectFit: 'cover',
              width: px(m.avatarSize),
            }}
          />
          {/*
            A flex column with one gap rather than two blocks and a margin.
            Stacked the other way the space between the lines is the sum of two
            line boxes plus whatever leading happens to be in scope, which is
            how the gap survived being given an explicit line height.
          */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: px(m.identityLineGap),
              // Centres the ink on the avatar rather than the boxes. Twice the
              // lift, because align-items centres the margin box.
              marginBottom: px(editorialIdentityLift('css') * 2),
            }}
          >
            <p
              style={{
                color: '#B9927A',
                fontFamily: font,
                fontSize: px(m.identityFontSize),
                fontWeight: m.wordmarkLightWeight,
                letterSpacing: px(m.identityFontSize * 0.12),
                lineHeight: m.identityLineHeight,
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              {CAROUSEL_EDITORIAL_WORDMARK.light}
              <span style={{ fontWeight: m.wordmarkBoldWeight }}>
                {CAROUSEL_EDITORIAL_WORDMARK.bold}
              </span>
            </p>
            <p
              style={{
                color: '#B9927A',
                fontFamily: font,
                fontSize: px(m.handleFontSize),
                fontWeight: 500,
                lineHeight: m.identityLineHeight,
                margin: 0,
              }}
            >
              @coach.kagiso
            </p>
          </div>
        </div>

        <h3
          style={{
            color: palette.foreground,
            fontFamily: font,
            fontSize: px(layout.headlineSize),
            fontWeight: 400,
            letterSpacing: '-0.005em',
            lineHeight: m.headlineLineHeight,
            marginTop: px(m.groupGap),
          }}
        >
          {renderRichText(slide.headline)}
        </h3>

        {slide.body ? (
          bodyAsList ? (
            <ul style={{ listStyle: 'none', marginTop: px(m.bodyGap) }}>
              {bodyPoints.map((point, pointIndex) => (
                <li
                  key={`${slide.id}-line-${pointIndex}`}
                  style={pointIndex ? { ...bodyStyle, marginTop: px(m.bodyItemGap) } : bodyStyle}
                >
                  {renderRichText(point)}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ ...bodyStyle, marginTop: px(m.bodyGap) }}>{renderRichText(slide.body)}</p>
          )
        ) : null}

        {slide.cta ? (
          <p
            style={{
              color: palette.accent,
              fontFamily: font,
              fontSize: px(24),
              fontWeight: 700,
              letterSpacing: px(24 * 0.14),
              marginTop: px(m.bodyGap),
              textTransform: 'uppercase',
            }}
          >
            {slide.cta}
          </p>
        ) : null}

        {slide.footnote ? (
          <p
            style={{
              color: palette.muted,
              fontFamily: font,
              fontSize: px(22),
              fontWeight: 400,
              marginTop: px(16),
            }}
          >
            {slide.footnote}
          </p>
        ) : null}
      </div>

      {/*
        Pinned: wordmark left, swipe cue right.

        Both sides are boxes of one height with their contents centred, rather
        than two items of different heights aligned on an edge. The swipe hand
        is taller than the type beside it, so an edge alignment left the
        wordmark and SWIPE sitting on visibly different lines.
      */}
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
        <span
          style={{
            alignItems: 'center',
            color: '#B9927A',
            display: 'flex',
            fontFamily: font,
            fontSize: px(m.footerFontSize),
            fontWeight: m.wordmarkLightWeight,
            height: px(footerRowHeight),
            letterSpacing: px(m.footerFontSize * 0.12),
            lineHeight: m.footerLineHeight,
            textTransform: 'uppercase',
          }}
        >
          {CAROUSEL_EDITORIAL_WORDMARK.light}
          <span style={{ fontWeight: m.wordmarkBoldWeight }}>
            {CAROUSEL_EDITORIAL_WORDMARK.bold}
          </span>
        </span>
        <span
          style={{
            alignItems: 'center',
            color: '#B9927A',
            display: 'flex',
            fontFamily: font,
            fontSize: px(m.footerFontSize),
            fontWeight: 700,
            gap: px(10),
            height: px(footerRowHeight),
            letterSpacing: px(m.footerFontSize * 0.1),
            lineHeight: m.footerLineHeight,
            textTransform: 'uppercase',
          }}
        >
          SWIPE
          {/*
            Design Studio's "Swipe left icon" rather than a lucide hand. It is a
            filled mark, so it takes a fill and no stroke.
          */}
          <svg
            viewBox={SWIPE_ICON_VIEW_BOX}
            aria-hidden="true"
            style={{ height: px(m.swipeIconSize), width: px(m.swipeIconSize) }}
          >
            {SWIPE_ICON_PATHS.map((d) => (
              <path key={d.slice(0, 24)} d={d} fill={SWIPE_ICON_COLOR} />
            ))}
          </svg>
        </span>
      </div>
    </>
  );
}
