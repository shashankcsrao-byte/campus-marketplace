const KEY = 'cm:chunk-reload-at';

/** True for the errors browsers throw when a lazily loaded file no longer exists (after a redeploy). */
export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|MIME type/i.test(msg);
}

/**
 * Reloads the page to pick up the new deployment. At most once every 10 seconds,
 * so a genuinely missing file can't cause a reload loop. Returns false if it didn't reload.
 */
export function reloadForNewVersion(): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    /* storage blocked: fall through and reload once */
  }
  if (Date.now() - last < 10_000) return false;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

/** The file a failed dynamic import was loading, when the browser names it (Chrome, Firefox). */
function failedModuleUrl(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/(https?:\/\/\S+?\.js)/);
  return match ? match[1] : null;
}

/**
 * Wraps a lazy page import so a brief network drop doesn't break navigation:
 * a failed download is retried twice (after 0.8 s, then 1.6 s) before giving up.
 * Browsers remember a failed module URL, so each retry asks for a fresh copy (?retry=N).
 */
export function retryImport<T>(load: () => Promise<T>, retries = 2, delayMs = 800): () => Promise<T> {
  return async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt === 0) return await load();
        const url = failedModuleUrl(lastError);
        return url
          ? ((await import(/* @vite-ignore */ `${url.split('?')[0]}?retry=${attempt}`)) as T)
          : await load();
      } catch (err) {
        if (!isChunkLoadError(err)) throw err;
        lastError = err;
        if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
    throw lastError;
  };
}
