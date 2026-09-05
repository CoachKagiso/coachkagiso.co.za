/**
 * How a saved group fits the box it was dropped into.
 *
 * A saved group is a selection of layers frozen into a reusable asset. Its
 * children keep their own coordinates - the space the selection occupied when
 * it was saved - while the layer that stands for the group has whatever size
 * the canvas gave it. Something has to map one onto the other.
 *
 * Nothing did. The preview laid the children out at their stored pixel sizes
 * inside the group layer's box, so a group saved at 900x700 and inserted at the
 * library's default 340x260 drew its contents at full size, spilling out of the
 * frame the user had just placed - and resizing the group afterwards moved the
 * frame without moving anything inside it. The PDF lane had a different bug
 * with the same root: it drew the group's `src`, which is a transparent
 * placeholder, so groups exported as empty space.
 *
 * Both lanes now scale the children through here, so they agree by
 * construction rather than by coincidence.
 *
 * Boxes scale per axis, because a group stretched wider should get wider.
 * Everything measured in one dimension - type size, stroke width, corner radius
 * - scales by the smaller of the two, which is what keeps a stretched group's
 * text readable instead of distorted.
 */

export type DesignGroupScale = {
  /** Horizontal box scale. */
  x: number;
  /** Vertical box scale. */
  y: number;
  /** Single-dimension scale, for type and strokes. */
  detail: number;
};

export function getDesignGroupScale(
  layerWidth: number,
  layerHeight: number,
  groupWidth: number,
  groupHeight: number,
): DesignGroupScale {
  const x = layerWidth / Math.max(1, groupWidth);
  const y = layerHeight / Math.max(1, groupHeight);
  return { x, y, detail: Math.min(x, y) };
}

/** The numeric fields of a layer that have to travel with the group's box. */
type ScalableLayerGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  letterSpacing?: number;
  padding?: number;
  strokeWidth?: number;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  outlineWidth?: number;
  blurAmount?: number;
};

function scaleDetail(value: number | undefined, scale: number) {
  return typeof value === 'number' ? value * scale : value;
}

/** One child of a saved group, placed and sized for the frame it is drawn in. */
export function scaleDesignGroupChild<T extends ScalableLayerGeometry>(child: T, scale: DesignGroupScale): T {
  return {
    ...child,
    x: child.x * scale.x,
    y: child.y * scale.y,
    width: child.width * scale.x,
    height: child.height * scale.y,
    fontSize: scaleDetail(child.fontSize, scale.detail),
    letterSpacing: scaleDetail(child.letterSpacing, scale.detail),
    padding: scaleDetail(child.padding, scale.detail),
    strokeWidth: scaleDetail(child.strokeWidth, scale.detail),
    borderRadius: scaleDetail(child.borderRadius, scale.detail),
    borderTopLeftRadius: scaleDetail(child.borderTopLeftRadius, scale.detail),
    borderTopRightRadius: scaleDetail(child.borderTopRightRadius, scale.detail),
    borderBottomRightRadius: scaleDetail(child.borderBottomRightRadius, scale.detail),
    borderBottomLeftRadius: scaleDetail(child.borderBottomLeftRadius, scale.detail),
    shadowOffsetX: scaleDetail(child.shadowOffsetX, scale.detail),
    shadowOffsetY: scaleDetail(child.shadowOffsetY, scale.detail),
    shadowBlur: scaleDetail(child.shadowBlur, scale.detail),
    outlineWidth: scaleDetail(child.outlineWidth, scale.detail),
    blurAmount: scaleDetail(child.blurAmount, scale.detail),
  };
}
