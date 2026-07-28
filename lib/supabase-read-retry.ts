const SAFE_READ_METHODS = new Set(['GET', 'HEAD']);

function requestMethod(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Retries only safe Supabase reads. A failed write can be ambiguous (the server
 * might have accepted it), so mutations deliberately keep their original
 * single-attempt behaviour.
 */
export function createSupabaseReadRetryFetch(
  fetchImplementation: typeof fetch = globalThis.fetch,
  { maxRetries = 2, retryDelayMs = 150 }: { maxRetries?: number; retryDelayMs?: number } = {},
) {
  return async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    if (!SAFE_READ_METHODS.has(requestMethod(input, init))) {
      return fetchImplementation(...args);
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await fetchImplementation(...args);
        if (response.status < 500 || attempt >= maxRetries) return response;
      } catch (error) {
        if (attempt >= maxRetries) throw error;
      }

      await wait(retryDelayMs * (attempt + 1));
    }
  };
}
