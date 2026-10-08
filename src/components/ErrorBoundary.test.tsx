import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom({ error }: { error: Error }): never {
  throw error;
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a recovery screen instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom error={new Error('kaboom')} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to marketplace' })).toHaveAttribute('href', '/');
  });

  it('explains a missing file from an old deployment', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.setItem('cm:chunk-reload-at', String(Date.now())); // already reloaded: don't loop
    render(
      <ErrorBoundary>
        <Boom error={new TypeError('Failed to fetch dynamically imported module: /assets/Messages-x.js')} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'A new version is available' })).toBeInTheDocument();
  });
});
