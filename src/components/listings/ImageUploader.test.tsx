import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploader from './ImageUploader';
import type { ImageItem } from '../../types';

const file = (name: string, type: string, size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

function setup(items: ImageItem[] = []) {
  const onChange = vi.fn();
  render(<ImageUploader items={items} onChange={onChange} />);
  return { onChange, input: screen.getByLabelText('Photos') };
}

describe('ImageUploader', () => {
  it('rejects PDFs and files over 10 MB with a reason', async () => {
    const { onChange, input } = setup();
    await userEvent.upload(input, [file('notes.pdf', 'application/pdf'), file('huge.jpg', 'image/jpeg', 15 * 1024 * 1024)], { applyAccept: false });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/notes\.pdf: only JPG, PNG or WebP/)).toBeInTheDocument();
    expect(screen.getByText(/huge\.jpg: file is larger than 10 MB/)).toBeInTheDocument();
  });

  it('accepts at most 5 photos in total', async () => {
    const existing: ImageItem[] = Array.from({ length: 4 }, (_, i) => ({ kind: 'existing', key: `k${i}`, path: `u/l/${i}.webp` }));
    const { onChange, input } = setup(existing);
    await userEvent.upload(input, [file('a.png', 'image/png'), file('b.png', 'image/png')]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(5);
    expect(screen.getByText('You can add up to 5 photos.')).toBeInTheDocument();
  });
});
