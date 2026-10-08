import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadForNewVersion } from './chunkReload';

describe('isChunkLoadError', () => {
  it('recognises missing-chunk errors from each browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/Home-abc.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
  });
  it('ignores ordinary errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});

describe('reloadForNewVersion', () => {
  const original = window.location;
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: original });
    sessionStorage.clear();
  });

  it('reloads once, then refuses to loop', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    expect(reloadForNewVersion()).toBe(true);
    expect(reloadForNewVersion()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
