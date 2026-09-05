import React from 'react';
import {
  Circle,
  Document,
  Font,
  Image,
  Line,
  Page,
  Path,
  Polygon,
  Svg,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import {
  getCircleGeometry,
  getLineGeometry,
  getRoundedRectanglePath,
  getShapePolygonPoints,
  type DesignCornerRadii,
} from '@/lib/content/design-shape-geometry';
import {
  EMBEDDABLE_BRAND_FONTS,
  getVectorExportBlocker,
  mapPdfFontFamily as mapFontFamily,
  mapPdfFontWeight as mapFontWeight,
  pdfFontHasItalic,
  type DesignVectorFeatureReport,
} from '@/lib/content/design-pdf-support';

// Vector PDF export for Design Studio.
//
// The layer model is already a scene graph - absolute boxes with rotation,
// fills, radii and text - so it can be drawn as real PDF objects instead of
// being photographed with html2canvas. That removes three problems at once:
// text stays sharp at any zoom, rotations are exact rather than approximated by
// a rasteriser, and nothing can be clipped by the browser viewport.
//
// The rule this file lives by: it may only draw what the preview draws. Every
// time the two disagree the user sees it, and always after the fact - the
// export is the artefact that leaves the building. Where a feature genuinely
// cannot be drawn as vector (a blurred layer, a font that only exists as
// woff2), `getVectorExportBlocker` says so and the caller falls back to the
// raster lane, which can. Silently dropping the feature is never an option.
//
// Shape geometry comes from `lib/content/design-shape-geometry` - the same
// module the preview draws from - so a circle here is the circle there.

const BASE = typeof window !== 'undefined' ? window.location.origin : '';

let fontsRegistered = false;

function registerDesignPdfFonts() {
  if (fontsRegistered || typeof window === 'undefined') return;
  fontsRegistered = true;

  Font.register({ family: 'Inter', fontWeight: 400, src: `${BASE}/fonts/Inter-Regular.ttf` });
  Font.register({ family: 'Inter', fontWeight: 500, src: `${BASE}/fonts/Inter-Medium.ttf` });
  Font.register({ family: 'Inter', fontWeight: 600, src: `${BASE}/fonts/Inter-SemiBold.ttf` });
  Font.register({ family: 'Inter', fontWeight: 700, src: `${BASE}/fonts/Inter-Bold.ttf` });
  Font.register({ family: 'Playfair Display', fontWeight: 500, src: `${BASE}/fonts/PlayfairDisplay-Medium.ttf` });
  Font.register({ family: 'Playfair Display', fontWeight: 600, src: `${BASE}/fonts/PlayfairDisplay-SemiBold.ttf` });
  Font.register({ family: 'Playfair Display', fontWeight: 700, src: `${BASE}/fonts/PlayfairDisplay-Bold.ttf` });
  Font.register({ family: 'Poppins', fontWeight: 400, src: `${BASE}/fonts/Poppins-Regular.ttf` });
  Font.register({ family: 'Poppins', fontWeight: 500, src: `${BASE}/fonts/Poppins-Medium.ttf` });
  Font.register({ family: 'Poppins', fontWeight: 600, src: `${BASE}/fonts/Poppins-SemiBold.ttf` });
  Font.register({ family: 'Poppins', fontWeight: 700, src: `${BASE}/fonts/Poppins-Bold.ttf` });
  // The only drawn italics in the studio. Registered at both weights, because
  // an italic run inside a bold heading resolves 700-italic and would throw if
  // only the 400 slot existed.
  Font.register({ family: 'Poppins', fontWeight: 400, fontStyle: 'italic', src: `${BASE}/fonts/Poppins-Italic.ttf` });
  Font.register({ family: 'Poppins', fontWeight: 700, fontStyle: 'italic', src: `${BASE}/fonts/Poppins-BoldItalic.ttf` });

  // Registered from the same table the blocker checks against, so a family can
  // never be allowed through by one and missing from the other.
  for (const [key, path] of Object.entries(EMBEDDABLE_BRAND_FONTS)) {
    Font.register({ family: key, src: `${BASE}${path}` });
  }

  try {
    (Font as unknown as { registerHyphenationCallback?: (cb: (word: string) => string[]) => void })
      .registerHyphenationCallback?.((word) => [word]);
  } catch {
    // Optional on some versions; wrapping still works without it.
  }
}

export { getVectorExportBlocker };
export type { DesignVectorFeatureReport };

export type DesignPdfTextRun = {
  text: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textTransform?: 'none' | 'uppercase';
};

// The panel owns the real types; this module only needs the shape it draws.
export type DesignPdfLayer = {
  id: string;
  type: 'text' | 'asset' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  flipX?: boolean;
  flipY?: boolean;
  borderRadius?: number;
  /** Per-corner radii; the preview has always had four, the export had one. */
  radii?: DesignCornerRadii;
  // text
  text?: string;
  /** The styled spans of the copy. One run means no inline formatting. */
  runs?: DesignPdfTextRun[];
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderColor?: string;
  padding?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  textDecoration?: 'none' | 'underline';
  fontStyle?: 'normal' | 'italic';
  // asset - already resolved to a raster data URI by the caller
  imageSrc?: string;
  fit?: 'contain' | 'cover';
  /**
   * A saved group draws its own children rather than an image: the asset's
   * `src` is a transparent placeholder, so drawing it produced a blank box.
   * Coordinates are in the group's own space, scaled by the box it sits in.
   */
  groupLayers?: DesignPdfLayer[];
  /**
   * Set when the layer asks for a shadow, outline or blur. A PDF has no filters,
   * so this is the flag that sends the design to the raster lane instead of
   * quietly flattening the effect away.
   */
  hasUnsupportedEffects?: boolean;
  // shape
  shape?: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

export type DesignPdfPage = {
  id: string;
  background: string;
  layers: DesignPdfLayer[];
  /**
   * The paper texture - grain, grid, ruled lines - as a full-bleed raster.
   * These are CSS gradient overlays in the preview, and the export used to
   * leave them out entirely, so every design came back on blank stock.
   */
  backgroundImage?: string;
};

export type DesignPdfInput = {
  width: number;
  height: number;
  pages: DesignPdfPage[];
};

/**
 * The same report, read off a built payload.
 *
 * The carousel export appends a CTA design it loads as a payload and never sees
 * as layers, so it needs its own way to ask the question. It used to check only
 * the font names, and only at the layer level - an italic or bolded run inside
 * the CTA slipped straight past it.
 */
export function getDesignPdfFeatureReport(design: DesignPdfInput): DesignVectorFeatureReport {
  const fontFamilies: string[] = [];
  const syntheticBoldFamilies: string[] = [];
  const italicFamilies: string[] = [];
  let usesLayerEffects = false;

  const visit = (layers: DesignPdfLayer[]) => {
    layers.forEach((layer) => {
      if (!layer.visible) return;
      if (layer.hasUnsupportedEffects) usesLayerEffects = true;
      if (layer.groupLayers?.length) visit(layer.groupLayers);
      if (layer.type !== 'text') return;

      const family = layer.fontFamily || 'sans';
      fontFamilies.push(family);
      const runs = layer.runs?.length
        ? layer.runs
        : [{ fontWeight: layer.fontWeight, fontStyle: layer.fontStyle }];
      runs.forEach((run) => {
        if ((run.fontStyle ?? layer.fontStyle) === 'italic') italicFamilies.push(family);
        if ((run.fontWeight ?? layer.fontWeight ?? 400) >= 700) syntheticBoldFamilies.push(family);
      });
    });
  };

  design.pages.forEach((page) => visit(page.layers));
  return { fontFamilies, syntheticBoldFamilies, italicFamilies, usesLayerEffects };
}

function getLayerRadii(layer: DesignPdfLayer): DesignCornerRadii {
  const base = layer.borderRadius || 0;
  return layer.radii ?? { topLeft: base, topRight: base, bottomRight: base, bottomLeft: base };
}

function hasAnyRadius(radii: DesignCornerRadii) {
  return Boolean(radii.topLeft || radii.topRight || radii.bottomRight || radii.bottomLeft);
}

/** React PDF takes the four corners individually, same as CSS. */
function radiiStyle(radii: DesignCornerRadii) {
  if (!hasAnyRadius(radii)) return {};
  return {
    borderTopLeftRadius: radii.topLeft,
    borderTopRightRadius: radii.topRight,
    borderBottomRightRadius: radii.bottomRight,
    borderBottomLeftRadius: radii.bottomLeft,
  };
}

function LayerFrame({ layer, children }: { layer: DesignPdfLayer; children: React.ReactNode }) {
  // Rotation is applied here as an exact transform about the box centre. This is
  // the part html2canvas approximated, and why rotated layers drifted.
  const transforms: string[] = [];
  if (layer.rotation) transforms.push(`rotate(${layer.rotation}deg)`);
  if (layer.flipX) transforms.push('scaleX(-1)');
  if (layer.flipY) transforms.push('scaleY(-1)');

  return (
    <View
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        ...(transforms.length ? { transform: transforms.join(' '), transformOrigin: 'center' } : {}),
      }}
    >
      {children}
    </View>
  );
}

function applyTransform(text: string, transform?: 'none' | 'uppercase') {
  return transform === 'uppercase' ? text.toUpperCase() : text;
}

function TextLayer({ layer }: { layer: DesignPdfLayer }) {
  const family = mapFontFamily(layer.fontFamily);
  const radii = getLayerRadii(layer);
  const centred = layer.textAlign === 'center';
  const runs = layer.runs?.length
    ? layer.runs
    : [{
        text: layer.text || '',
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textDecoration: layer.textDecoration,
        textTransform: layer.textTransform,
      }];

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        ...(layer.backgroundColor ? { backgroundColor: layer.backgroundColor } : {}),
        ...(layer.borderColor ? { borderWidth: 1.5, borderColor: layer.borderColor } : {}),
        ...radiiStyle(radii),
        ...(layer.padding ? { padding: layer.padding } : {}),
        // The preview only centres the copy in its box when the box is centred;
        // left- and right-aligned text starts at the top. Centring everything
        // here is what floated captions away from where they were placed.
        justifyContent: centred ? 'center' : 'flex-start',
      }}
    >
      <Text
        style={{
          // Top-aligned copy is positioned rather than laid out in the box.
          //
          // React PDF drops a line that does not fit the height it is given,
          // and its line box is the font's full ascent-plus-descent whenever
          // the layer's line height is tighter than that - which for a display
          // face is most of the time. A text layer auto-fitted to the browser's
          // tighter line box therefore lost its text completely, silently, in
          // both the PDF and the PNG drawn from it. Taking the height off lets
          // the line exist; the canvas lets it overflow too.
          ...(centred ? {} : { position: 'absolute', top: 0, left: 0, right: 0 }),
          fontFamily: family,
          ...(mapFontWeight(family, layer.fontWeight) ? { fontWeight: mapFontWeight(family, layer.fontWeight) } : {}),
          fontSize: layer.fontSize || 16,
          color: layer.color || '#142334',
          lineHeight: layer.lineHeight || 1.2,
          textAlign: layer.textAlign || 'left',
          ...(layer.letterSpacing ? { letterSpacing: layer.letterSpacing } : {}),
        }}
      >
        {/*
          One nested Text per styled span. Selecting three words and bolding
          them is the whole point of the inline toolbar, and the export used to
          send the flat string - so the emphasis simply was not there.
        */}
        {runs.map((run, index) => {
          const weight = mapFontWeight(family, run.fontWeight ?? layer.fontWeight);
          // Asking a family for a style it was not registered at throws and
          // takes the whole document with it, so italic is emitted only where
          // there is a drawn face to resolve. The blocker keeps the other
          // families out of this lane; this is the second lock on the same door.
          const italic =
            (run.fontStyle ?? layer.fontStyle) === 'italic' && pdfFontHasItalic(layer.fontFamily || 'sans');
          return (
            <Text
              key={`${layer.id}-run-${index}`}
              style={{
                ...(weight ? { fontWeight: weight } : {}),
                ...(italic ? { fontStyle: 'italic' as const } : {}),
                ...((run.textDecoration ?? layer.textDecoration) === 'underline'
                  ? { textDecoration: 'underline' }
                  : {}),
              }}
            >
              {applyTransform(run.text, run.textTransform ?? layer.textTransform)}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

function ShapeLayer({ layer }: { layer: DesignPdfLayer }) {
  const shape = layer.shape || 'rectangle';
  const strokeWidth = Math.max(layer.strokeWidth || 0, 0);
  const fill = layer.fillColor && layer.fillColor !== 'transparent' ? layer.fillColor : 'none';
  const stroke = strokeWidth > 0 ? layer.strokeColor : undefined;

  // Every shape is drawn as SVG, from the same geometry the preview uses.
  // Approximating a circle with a border radius and a line with a thin box is
  // what made a circle in a tall frame come back as a stadium, and dropped
  // every rule to the top of its own box.
  const common = {
    width: layer.width,
    height: layer.height,
    viewBox: `0 0 ${layer.width} ${layer.height}`,
  };

  if (shape === 'line') {
    const line = getLineGeometry(layer.width, layer.height);
    return (
      <Svg {...common}>
        <Line
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={layer.strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (shape === 'rectangle') {
    return (
      <Svg {...common}>
        <Path
          d={getRoundedRectanglePath(layer.width, layer.height, getLayerRadii(layer), strokeWidth)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }

  if (shape === 'circle') {
    const circle = getCircleGeometry(layer.width, layer.height, strokeWidth);
    return (
      <Svg {...common}>
        <Circle cx={circle.cx} cy={circle.cy} r={circle.r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </Svg>
    );
  }

  return (
    <Svg {...common}>
      <Polygon
        points={getShapePolygonPoints(shape, layer.width, layer.height, strokeWidth)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AssetLayer({ layer }: { layer: DesignPdfLayer }) {
  // A saved group carries its children, not a picture of them. They arrive
  // already scaled into this box by `lib/content/design-group-layout`, the same
  // module the canvas scales them with, so there is nothing to do here but draw.
  if (layer.groupLayers?.length) {
    return (
      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
        {layer.groupLayers
          .filter((child) => child.visible)
          .map((child) => (
            <DesignPdfLayerView key={child.id} layer={child} />
          ))}
      </View>
    );
  }

  if (!layer.imageSrc) return null;
  return (
    // This is React PDF's Image primitive, not an HTML img: there is no alt
    // prop, and a PDF has no alternative-text slot for it to land in.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      src={layer.imageSrc}
      style={{
        width: '100%',
        height: '100%',
        objectFit: layer.fit === 'cover' ? 'cover' : 'contain',
        ...radiiStyle(getLayerRadii(layer)),
      }}
    />
  );
}

function DesignPdfLayerView({ layer }: { layer: DesignPdfLayer }) {
  return (
    <LayerFrame layer={layer}>
      {layer.type === 'text' ? (
        <TextLayer layer={layer} />
      ) : layer.type === 'shape' ? (
        <ShapeLayer layer={layer} />
      ) : (
        <AssetLayer layer={layer} />
      )}
    </LayerFrame>
  );
}

/**
 * The pages on their own, so they can be appended to another document - a
 * carousel deck plus a custom CTA slide, for instance - rather than only
 * standing alone.
 */
export function buildDesignPdfPages(design: DesignPdfInput, keyPrefix = 'design') {
  registerDesignPdfFonts();
  return design.pages.map((page, pageIndex) => (
    <Page
      key={`${keyPrefix}-${page.id}-${pageIndex}`}
      size={{ width: design.width, height: design.height }}
      style={{ position: 'relative', backgroundColor: page.background || '#FFFFFF' }}
    >
      {page.backgroundImage ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={page.backgroundImage}
          style={{ position: 'absolute', left: 0, top: 0, width: design.width, height: design.height }}
        />
      ) : null}
      {page.layers
        .filter((layer) => layer.visible)
        .map((layer) => (
          <DesignPdfLayerView key={layer.id} layer={layer} />
        ))}
    </Page>
  ));
}

/**
 * Rescales a design to another frame, preserving aspect ratio and centring what
 * is left over. A CTA template designed at one size has to sit flush with the
 * deck it is appended to, and stretching it would distort the artwork.
 */
export function scaleDesignPdfInput(
  design: DesignPdfInput,
  targetWidth: number,
  targetHeight: number,
): DesignPdfInput {
  if (design.width === targetWidth && design.height === targetHeight) return design;

  const scale = Math.min(targetWidth / design.width, targetHeight / design.height);
  const offsetX = (targetWidth - design.width * scale) / 2;
  const offsetY = (targetHeight - design.height * scale) / 2;
  const size = (value: number | undefined) => (typeof value === 'number' ? value * scale : value);

  return {
    width: targetWidth,
    height: targetHeight,
    pages: design.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) => ({
        ...layer,
        x: layer.x * scale + offsetX,
        y: layer.y * scale + offsetY,
        width: layer.width * scale,
        height: layer.height * scale,
        fontSize: size(layer.fontSize),
        padding: size(layer.padding),
        borderRadius: size(layer.borderRadius),
        // The four corners travel with the box, or a scaled-down card keeps
        // full-size corners and reads as a pill.
        radii: layer.radii
          ? {
              topLeft: layer.radii.topLeft * scale,
              topRight: layer.radii.topRight * scale,
              bottomRight: layer.radii.bottomRight * scale,
              bottomLeft: layer.radii.bottomLeft * scale,
            }
          : undefined,
        strokeWidth: size(layer.strokeWidth),
        letterSpacing: size(layer.letterSpacing),
      })),
    })),
  };
}

function DesignPdfDocument({ design }: { design: DesignPdfInput }) {
  return <Document>{buildDesignPdfPages(design)}</Document>;
}

export async function renderDesignPdfBlob(design: DesignPdfInput): Promise<Blob> {
  registerDesignPdfFonts();
  return pdf(<DesignPdfDocument design={design} />).toBlob();
}
