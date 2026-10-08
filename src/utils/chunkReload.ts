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
