// Renders an uploaded carousel PDF to page images in the browser.
//
// Deliberately client-side. Rasterising a PDF on the server would need
// node-canvas, a heavy native dependency; the browser already has canvas, and
// the existing Transform upload path takes multipart image parts either way.

/** LinkedIn allows far more, but a deck's structure is legible well before this. */
export const MAX_CAROUSEL_PDF_PAGES = 12;

/** Wide enough for OCR to read slide copy, small enough to keep the upload sane. */
const TARGET_PAGE_WIDTH = 1000;

const JPEG_QUALITY = 0.82;

export type CarouselPdfPageImage = {
  pageNumber: number;
  blob: Blob;
};

export type CarouselPdfReadResult = {
  pages: CarouselPdfPageImage[];
  totalPages: number;
  /** True when the deck was longer than MAX_CAROUSEL_PDF_PAGES and was trimmed. */
  truncated: boolean;
};

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read a page of this PDF.'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export async function readCarouselPdfPages(file: File): Promise<CarouselPdfReadResult> {
  // Imported lazily so the pdf.js bundle only loads when a PDF is actually
  // uploaded, rather than on every Content Studio page view.
  const pdfjs = await import('pdfjs-dist');

  // pdf.js needs its worker resolved explicitly under a bundler. Pointing at the
  // packaged worker via import.meta.url lets the bundler emit and fingerprint it,
  // which avoids shipping a hand-copied duplicate in /public that silently goes
  // stale on the next pdfjs-dist upgrade.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  // Hold the loading task: destroy() lives there, not on the document proxy, and
  // it is what tears down the worker.
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    const totalPages = document.numPages;
    const pageCount = Math.min(totalPages, MAX_CAROUSEL_PDF_PAGES);
    const pages: CarouselPdfPageImage[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = TARGET_PAGE_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document_createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare a canvas for this PDF.');

      // A carousel page can be transparent; OCR reads dark-on-white far better
      // than dark-on-transparent, which rasterises to black.
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push({ pageNumber, blob: await canvasToJpegBlob(canvas) });

      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }

    return { pages, totalPages, truncated: totalPages > pageCount };
  } finally {
    await loadingTask.destroy();
  }
}

function document_createCanvas(width: number, height: number) {
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}
