import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadForNewVersion, retryImport } from './chunkReload';

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

describe('retryImport', () => {
  const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /assets/Login-x.js');

  it('retries a failed page download and then succeeds', async () => {
    const load = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValue({ default: 'Login' });
    await expect(retryImport(load, 2, 1)()).resolves.toEqual({ default: 'Login' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retries', async () => {
    const load = vi.fn().mockRejectedValue(chunkError());
    await expect(retryImport(load, 2, 1)()).rejects.toThrow(/dynamically imported module/);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('does not retry ordinary errors', async () => {
    const load = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(retryImport(load, 2, 1)()).rejects.toThrow('boom');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
