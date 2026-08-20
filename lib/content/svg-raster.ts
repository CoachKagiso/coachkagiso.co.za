// Converts an SVG asset to a PNG data URL.
//
// React PDF's <Image> cannot read SVG, and the vector export still wants the
// asset present rather than silently dropped. The rest of the page stays vector;
// only the SVG artwork becomes a bitmap, drawn at a generous size so it holds up
// when the PDF is zoomed.

const MIN_RASTER_SIZE = 1024;

export async function rasteriseSvgDataUrl(
  src: string,
  naturalWidth?: number,
  naturalHeight?: number,
): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined;

  const image = new Image();
  image.crossOrigin = 'anonymous';

  const loaded = await new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

  if (!loaded) return undefined;

  const sourceWidth = naturalWidth || image.naturalWidth || MIN_RASTER_SIZE;
  const sourceHeight = naturalHeight || image.naturalHeight || MIN_RASTER_SIZE;
  // Scale small vector artwork up so the embedded bitmap is not the weak link.
  const scale = Math.max(1, MIN_RASTER_SIZE / Math.max(sourceWidth, sourceHeight));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);

  const context = canvas.getContext('2d');
  if (!context) return undefined;

  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  } catch {
    // A tainted canvas (remote SVG without CORS) cannot be exported.
    return undefined;
  }
}
