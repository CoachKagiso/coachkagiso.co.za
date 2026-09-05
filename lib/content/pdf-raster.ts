/**
 * A PDF page, drawn back out as a bitmap.
 *
 * This is what lets the PNG export stop photographing the DOM. html2canvas
 * does not lay text out - it asks the browser where the text is, then draws the
 * string itself at a baseline it derives from its own hidden probe. That probe
 * disagrees with the browser by roughly half an em, growing with type size, so
 * every exported bitmap carried its text lower than the canvas showed it. The
 * boxes were always exact, which is what made it read as "the text has moved"
 * rather than "the export is broken".
 *
 * Rendering the vector PDF instead means the PNG and the PDF are the same
 * artefact at different resolutions, and both are drawn from the layer model
 * rather than from a photograph of it.
 */

export async function rasterisePdfPageToBlob(
  data: ArrayBuffer,
  pageNumber: number,
  scale: number,
): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  // Resolved through import.meta.url so the bundler emits and fingerprints the
  // worker, rather than a hand-copied duplicate in /public going stale.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  // getDocument takes ownership of the buffer, so hand it a copy - the caller
  // may still want the bytes.
  const loadingTask = pdfjs.getDocument({ data: data.slice(0) });
  const document_ = await loadingTask.promise;

  try {
    const page = await document_.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the PNG canvas.');

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    // A large export is tens of megabytes of RGBA; free it once it is a blob.
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new Error('Could not create the PNG export.');
    return blob;
  } finally {
    await loadingTask.destroy();
  }
}
