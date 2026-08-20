import React from 'react';
import {
  Document,
  Font,
  Image,
  Page,
  Svg,
  Polygon,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';

// Vector PDF export for Design Studio.
//
// The layer model is already a scene graph - absolute boxes with rotation,
// fills, radii and text - so it can be drawn as real PDF objects instead of
// being photographed with html2canvas. That removes three problems at once:
// text stays sharp at any zoom, rotations are exact rather than approximated by
// a rasteriser, and nothing can be clipped by the browser viewport.
//
// Fonts are the constraint. React PDF embeds TTF/OTF only, so the woff/woff2
// brand faces cannot be used here. Rather than silently substituting a font and
// shipping a PDF that looks wrong, `getVectorExportBlocker` reports the problem
// and the caller falls back to the raster lane.

const BASE = typeof window !== 'undefined' ? window.location.origin : '';

/** Brand faces available as OTF/TTF, so embeddable in a PDF. */
const embeddableBrandFonts: Record<string, string> = {
  // Converted from the shipped woff2 with wawoff2; the source is CFF, so it
  // decompresses straight to a .otf React PDF can embed.
  daughterHand: '/fonts/brand/daughter-hand.otf',
  linebrush: '/fonts/brand/linebrush.otf',
  mibrush: '/fonts/brand/mibrush-regular.otf',
  simpleNotes: '/fonts/brand/simple-notes-regular.otf',
  walesiaSignatureBrush: '/fonts/brand/walesia-signature-brush.otf',
  walkingDream: '/fonts/brand/walking-dream.otf',
};

/**
 * Faces that exist only as woff/woff2. React PDF cannot parse those, so a design
 * using one cannot be exported as vector without changing how it looks.
 */
const nonEmbeddableFonts = new Set([
  'alohaLover',
  'bableya',
  'heroIn',
  'kaliebLuxury',
  'hand', // Comic Sans / system fallback - not ours to embed.
]);

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

  for (const [key, path] of Object.entries(embeddableBrandFonts)) {
    Font.register({ family: key, src: `${BASE}${path}` });
  }

  try {
    (Font as unknown as { registerHyphenationCallback?: (cb: (word: string) => string[]) => void })
      .registerHyphenationCallback?.((word) => [word]);
  } catch {
    // Optional on some versions; wrapping still works without it.
  }
}

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
  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  textDecoration?: 'none' | 'underline';
  fontStyle?: 'normal' | 'italic';
  // asset - already resolved to a raster data URI by the caller
  imageSrc?: string;
  fit?: 'contain' | 'cover';
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
};

export type DesignPdfInput = {
  width: number;
  height: number;
  pages: DesignPdfPage[];
};

/**
 * Returns a human-readable reason the design cannot be drawn as vector, or null
 * when it can. Checked before rendering so the caller can fall back cleanly
 * rather than producing a PDF with substituted fonts.
 */
export function getVectorExportBlocker(fontFamilies: string[]): string | null {
  const blocked = [...new Set(fontFamilies)].filter((family) => nonEmbeddableFonts.has(family));
  if (blocked.length === 0) return null;
  return `${blocked.join(', ')} ${blocked.length === 1 ? 'is' : 'are'} only available as a web font, which cannot be embedded in a vector PDF`;
}

function mapFontFamily(family?: string) {
  if (!family) return 'Inter';
  if (family === 'serif') return 'Playfair Display';
  if (family === 'sans' || family === 'interTight') return 'Inter';
  if (embeddableBrandFonts[family]) return family;
  return 'Inter';
}

/** Inter and Playfair are registered per weight; brand faces have one weight. */
function mapFontWeight(family: string, weight?: number) {
  if (family !== 'Inter' && family !== 'Playfair Display') return undefined;
  const requested = weight || 400;
  if (family === 'Playfair Display') {
    if (requested >= 700) return 700;
    return requested >= 600 ? 600 : 500;
  }
  if (requested >= 700) return 700;
  if (requested >= 600) return 600;
  if (requested >= 500) return 500;
  return 400;
}

function polygonPoints(shape: string, width: number, height: number) {
  switch (shape) {
    case 'triangle':
      return `${width / 2},0 ${width},${height} 0,${height}`;
    case 'diamond':
      return `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
    case 'hexagon':
      return `${width * 0.25},0 ${width * 0.75},0 ${width},${height / 2} ${width * 0.75},${height} ${width * 0.25},${height} 0,${height / 2}`;
    case 'star': {
      const cx = width / 2;
      const cy = height / 2;
      const outer = Math.min(width, height) / 2;
      const inner = outer * 0.42;
      const points: string[] = [];
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * index - Math.PI / 2;
        points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
      }
      return points.join(' ');
    }
    default:
      return '';
  }
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

function TextLayer({ layer }: { layer: DesignPdfLayer }) {
  const family = mapFontFamily(layer.fontFamily);
  const weight = mapFontWeight(family, layer.fontWeight);
  const value = layer.textTransform === 'uppercase' ? (layer.text || '').toUpperCase() : layer.text || '';

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        ...(layer.backgroundColor ? { backgroundColor: layer.backgroundColor } : {}),
        ...(layer.borderRadius ? { borderRadius: layer.borderRadius } : {}),
        ...(layer.padding ? { padding: layer.padding } : {}),
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: family,
          ...(weight ? { fontWeight: weight } : {}),
          fontSize: layer.fontSize || 16,
          color: layer.color || '#142334',
          lineHeight: layer.lineHeight || 1.2,
          textAlign: layer.textAlign || 'left',
          ...(layer.letterSpacing ? { letterSpacing: layer.letterSpacing } : {}),
          ...(layer.textDecoration === 'underline' ? { textDecoration: 'underline' } : {}),
          ...(layer.fontStyle === 'italic' ? { fontStyle: 'italic' } : {}),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ShapeLayer({ layer }: { layer: DesignPdfLayer }) {
  const shape = layer.shape || 'rectangle';
  const fill = layer.fillColor && layer.fillColor !== 'transparent' ? layer.fillColor : undefined;
  const stroke = layer.strokeWidth ? layer.strokeColor : undefined;

  if (shape === 'rectangle' || shape === 'circle' || shape === 'line') {
    const radius = shape === 'circle'
      ? Math.min(layer.width, layer.height) / 2
      : layer.borderRadius || 0;
    return (
      <View
        style={{
          width: '100%',
          height: shape === 'line' ? Math.max(1, layer.strokeWidth || 1) : '100%',
          ...(fill ? { backgroundColor: fill } : {}),
          ...(shape === 'line' && layer.strokeColor ? { backgroundColor: layer.strokeColor } : {}),
          ...(radius ? { borderRadius: radius } : {}),
          ...(stroke && shape !== 'line'
            ? { borderWidth: layer.strokeWidth, borderColor: layer.strokeColor }
            : {}),
        }}
      />
    );
  }

  return (
    <Svg width={layer.width} height={layer.height} viewBox={`0 0 ${layer.width} ${layer.height}`}>
      <Polygon
        points={polygonPoints(shape, layer.width, layer.height)}
        fill={fill || 'none'}
        stroke={stroke}
        strokeWidth={layer.strokeWidth || 0}
      />
    </Svg>
  );
}

function AssetLayer({ layer }: { layer: DesignPdfLayer }) {
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
        ...(layer.borderRadius ? { borderRadius: layer.borderRadius } : {}),
      }}
    />
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
      {page.layers
        .filter((layer) => layer.visible)
        .map((layer) => (
          <LayerFrame key={layer.id} layer={layer}>
            {layer.type === 'text' ? (
              <TextLayer layer={layer} />
            ) : layer.type === 'shape' ? (
              <ShapeLayer layer={layer} />
            ) : (
              <AssetLayer layer={layer} />
            )}
          </LayerFrame>
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
