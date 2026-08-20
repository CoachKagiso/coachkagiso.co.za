// Background removal for Design Studio assets.
//
// Runs entirely in the browser: the image is never uploaded anywhere, and there
// is no per-image cost or API key. The trade-off is a one-off model download
// (tens of MB) from the library's CDN on first use, cached by the browser
// afterwards. Callers should say so in the UI rather than leaving a long first
// run unexplained.

export type BackgroundRemovalProgress = {
  /** 0-1, or null while the total is unknown. */
  ratio: number | null;
  label: string;
};

/**
 * The library reports progress *per resource*, not overall - each of the ~26
 * model chunks counts from 0 to its own total. Rendering that single ratio as a
 * percentage makes the bar jump backwards (76% then 35%), so track how many
 * chunks have finished instead and report that.
 */
function createProgressTracker(onProgress?: (progress: BackgroundRemovalProgress) => void) {
  const seen = new Set<string>();
  const done = new Set<string>();

  return (key: string, current: number, total: number) => {
    if (!onProgress) return;

    // Keys look like "fetch:/models/...", which is not something to show a user.
    if (key.startsWith('fetch')) {
      seen.add(key);
      if (total > 0 && current >= total) done.add(key);
      onProgress({
        ratio: seen.size > 0 ? done.size / seen.size : null,
        label: `Downloading the cut-out model, one time only (${done.size} of ${seen.size} parts)...`,
      });
      return;
    }

    onProgress({
      ratio: total > 0 ? Math.min(1, current / total) : null,
      label: 'Removing the background...',
    });
  };
}

/**
 * The model arrives as ~26 separate chunks from a third-party CDN. A single
 * failed chunk (seen in testing as ERR_HTTP2_PROTOCOL_ERROR) leaves the
 * download stalled with no rejection, so the caller would sit on a frozen
 * progress bar forever. Fail loudly instead, with advice that actually helps.
 */
const STALLED_DOWNLOAD_TIMEOUT_MS = 4 * 60 * 1000;

export async function removeImageBackground(
  source: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void,
): Promise<string> {
  // Imported lazily so the WASM bundle only loads when the feature is used,
  // never on a normal Design Studio page view.
  const { removeBackground } = await import('@imgly/background-removal');

  let lastProgressAt = Date.now();
  const track = createProgressTracker(onProgress);

  // The model is fetched from the library's CDN by default, in ~26 chunks. That
  // proved slow and occasionally flaky in testing. Setting
  // NEXT_PUBLIC_BG_REMOVAL_PUBLIC_PATH to a self-hosted copy of
  // @imgly/background-removal-data switches the download to your own origin
  // without touching this code.
  const publicPath = process.env.NEXT_PUBLIC_BG_REMOVAL_PUBLIC_PATH?.trim();

  const work = removeBackground(source, {
    ...(publicPath ? { publicPath } : {}),
    output: { format: 'image/png' },
    progress: (key: string, current: number, total: number) => {
      lastProgressAt = Date.now();
      track(key, current, total);
    },
  });

  const stallWatch = new Promise<never>((_, reject) => {
    const timer = window.setInterval(() => {
      if (Date.now() - lastProgressAt < STALLED_DOWNLOAD_TIMEOUT_MS) return;
      window.clearInterval(timer);
      reject(
        new Error(
          'the model download stalled. It is fetched from an external CDN in chunks, and one failed. Try again - completed chunks are cached, so a retry usually finishes.',
        ),
      );
    }, 5000);
    void work.finally(() => window.clearInterval(timer));
  });

  const blob = await Promise.race([work, stallWatch]);
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the cut-out image.'));
    };
    reader.onerror = () => reject(new Error('Could not read the cut-out image.'));
    reader.readAsDataURL(blob);
  });
}
