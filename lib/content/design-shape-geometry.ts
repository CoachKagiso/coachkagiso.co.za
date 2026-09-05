/**
 * The geometry of a Design Studio shape, in one place.
 *
 * Design Studio draws every shape twice: once as SVG in the browser preview,
 * and once as vector objects in the exported PDF. The two used to carry their
 * own copies of this arithmetic, and they disagreed - a circle became a rounded
 * rectangle, a line jumped to the top of its box, a star had a different waist,
 * and the stroke inset was missing entirely. Nothing caught it because both
 * looked plausible on their own.
 *
 * One module, two callers. Everything here works in the shape's own box: the
 * origin is the top-left of the layer and the numbers are the layer's own
 * width and height, so the same values feed an SVG viewBox and a PDF Svg alike.
 *
 * The stroke inset is the reason these are not one-liners. SVG centres a stroke
 * on the path, so a shape drawn on the edge of its box loses half the stroke to
 * clipping. Every function here pulls the path in by half the stroke width, so
 * what is drawn always fits the box it was given.
 */

export type DesignShapeGeometryKind =
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'line';

export type DesignCornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Corner radii that actually fit the box.
 *
 * Two radii sharing an edge cannot together be longer than that edge, or the
 * curves cross and the outline folds back on itself. CSS solves this by scaling
 * every radius by the same factor until the worst edge fits; this does the
 * same, so a shape's corners round the way its inspector says they will.
 */
export function normalizeShapeRadii(radii: DesignCornerRadii, width: number, height: number): DesignCornerRadii {
  const maxRadius = Math.max(0, Math.min(width, height) / 2);
  const clamped = {
    topLeft: clampNumber(radii.topLeft, 0, maxRadius),
    topRight: clampNumber(radii.topRight, 0, maxRadius),
    bottomRight: clampNumber(radii.bottomRight, 0, maxRadius),
    bottomLeft: clampNumber(radii.bottomLeft, 0, maxRadius),
  };
  const scale = Math.min(
    1,
    clamped.topLeft + clamped.topRight > 0 ? width / (clamped.topLeft + clamped.topRight) : 1,
    clamped.bottomLeft + clamped.bottomRight > 0 ? width / (clamped.bottomLeft + clamped.bottomRight) : 1,
    clamped.topLeft + clamped.bottomLeft > 0 ? height / (clamped.topLeft + clamped.bottomLeft) : 1,
    clamped.topRight + clamped.bottomRight > 0 ? height / (clamped.topRight + clamped.bottomRight) : 1,
  );

  return {
    topLeft: clamped.topLeft * scale,
    topRight: clamped.topRight * scale,
    bottomRight: clamped.bottomRight * scale,
    bottomLeft: clamped.bottomLeft * scale,
  };
}

/** A rounded rectangle inset by half the stroke, as an SVG path. */
export function getRoundedRectanglePath(
  layerWidth: number,
  layerHeight: number,
  radii: DesignCornerRadii,
  strokeWidth: number,
) {
  const halfStroke = strokeWidth / 2;
  const x = halfStroke;
  const y = halfStroke;
  const width = Math.max(0, layerWidth - strokeWidth);
  const height = Math.max(0, layerHeight - strokeWidth);
  const fitted = normalizeShapeRadii(radii, width, height);
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x + fitted.topLeft} ${y}`,
    `H ${right - fitted.topRight}`,
    fitted.topRight ? `Q ${right} ${y} ${right} ${y + fitted.topRight}` : `L ${right} ${y}`,
    `V ${bottom - fitted.bottomRight}`,
    fitted.bottomRight ? `Q ${right} ${bottom} ${right - fitted.bottomRight} ${bottom}` : `L ${right} ${bottom}`,
    `H ${x + fitted.bottomLeft}`,
    fitted.bottomLeft ? `Q ${x} ${bottom} ${x} ${bottom - fitted.bottomLeft}` : `L ${x} ${bottom}`,
    `V ${y + fitted.topLeft}`,
    fitted.topLeft ? `Q ${x} ${y} ${x + fitted.topLeft} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ');
}

/**
 * A circle, not an ellipse.
 *
 * The radius comes from the shorter side, so a circle in a tall box stays round
 * and sits in the middle of it. The PDF lane used to approximate this with a
 * border radius on a full-size box, which turns into a stadium the moment the
 * box is not square.
 */
export function getCircleGeometry(layerWidth: number, layerHeight: number, strokeWidth: number) {
  return {
    cx: layerWidth / 2,
    cy: layerHeight / 2,
    r: Math.max(0, Math.min(layerWidth, layerHeight) / 2 - strokeWidth / 2),
  };
}

/** A horizontal rule across the middle of the box - not along its top edge. */
export function getLineGeometry(layerWidth: number, layerHeight: number) {
  return { x1: 0, y1: layerHeight / 2, x2: layerWidth, y2: layerHeight / 2 };
}

export function getStarPoints(width: number, height: number, strokeWidth: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.max(0, Math.min(width, height) / 2 - strokeWidth);
  const innerRadius = outerRadius * 0.45;

  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 5);
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(' ');
}

export function getPolygonShapePoints(
  shape: Exclude<DesignShapeGeometryKind, 'rectangle' | 'circle' | 'line' | 'star'>,
  width: number,
  height: number,
  strokeWidth: number,
) {
  const inset = Math.max(strokeWidth / 2, 1);
  if (shape === 'triangle') {
    return `${width / 2},${inset} ${width - inset},${height - inset} ${inset},${height - inset}`;
  }
  if (shape === 'diamond') {
    return `${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`;
  }
  return `${width * 0.26},${inset} ${width * 0.74},${inset} ${width - inset},${height / 2} ${width * 0.74},${height - inset} ${width * 0.26},${height - inset} ${inset},${height / 2}`;
}

/** The points for whichever of the polygon shapes this is. */
export function getShapePolygonPoints(
  shape: DesignShapeGeometryKind,
  width: number,
  height: number,
  strokeWidth: number,
) {
  if (shape === 'star') return getStarPoints(width, height, strokeWidth);
  if (shape === 'rectangle' || shape === 'circle' || shape === 'line') return '';
  return getPolygonShapePoints(shape, width, height, strokeWidth);
}
