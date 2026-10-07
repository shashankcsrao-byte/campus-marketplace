import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { getPublicUrl } from '../../services/storageService';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES, MAX_UPLOAD_BYTES } from '../../utils/constants';
import { UploadIcon, XIcon } from '../ui/Icons';
import type { ImageItem } from '../../types';

interface ImageUploaderProps {
  items: ImageItem[];
  onChange: (items: ImageItem[]) => void;
  error?: string;
  disabled?: boolean;
}

export default function ImageUploader({ items, onChange, error, disabled }: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  // Release object URLs when the uploader unmounts.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => itemsRef.current.forEach((i) => i.kind === 'new' && URL.revokeObjectURL(i.preview)),
    [],
  );

  const addFiles = (files: FileList | File[]) => {
    const issues: string[] = [];
    const added: ImageItem[] = [];
    let room = MAX_IMAGES - items.length;

    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        issues.push(`${file.name}: only JPG, PNG or WebP images are allowed.`);
      } else if (file.size > MAX_UPLOAD_BYTES) {
        issues.push(`${file.name}: file is larger than 10 MB.`);
      } else if (room <= 0) {
        issues.push(`You can add up to ${MAX_IMAGES} photos.`);
        break;
      } else {
        added.push({ kind: 'new', key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
        room--;
      }
    }
    setProblems(issues);
    if (added.length) onChange([...items, ...added]);
  };

  const remove = (key: string) => {
    const item = items.find((i) => i.key === key);
    if (item?.kind === 'new') URL.revokeObjectURL(item.preview);
    onChange(items.filter((i) => i.key !== key));
    setProblems([]);
  };

  const makeCover = (key: string) => {
    const item = items.find((i) => i.key === key);
    if (item) onChange([item, ...items.filter((i) => i.key !== key)]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const full = items.length >= MAX_IMAGES;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-bold text-ink" id={`${inputId}-label`}>
          Photos
        </span>
        <span className="rounded-full border-2 border-ink bg-white px-2 text-xs font-bold tabular-nums">
          {items.length}/{MAX_IMAGES}
        </span>
      </div>

      {!full && (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed px-4 py-9 text-center transition-colors focus-within:ring-4 focus-within:ring-sun ${
            dragging ? 'border-brand-600 bg-brand-100' : error ? 'border-red-600 bg-red-50' : 'border-ink bg-sky-soft hover:bg-sun-soft'
          } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          <span className={`mb-3 flex size-14 items-center justify-center rounded-2xl border-2 border-ink bg-white text-ink shadow-pop-sm transition-transform group-hover:-rotate-6 motion-reduce:transition-none ${dragging ? 'animate-wiggle' : ''}`}>
            <UploadIcon className="size-7" />
          </span>
          <span className="font-display text-base font-semibold text-ink">
            <span className="marker">Choose photos</span> or drag them here
          </span>
          <span className="mt-1 text-xs font-semibold text-slate-600">JPG, PNG or WebP · up to 10 MB each · max {MAX_IMAGES}</span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled}
            aria-labelledby={`${inputId}-label`}
            aria-invalid={!!error || undefined}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = ''; // allow picking the same file again
            }}
          />
        </label>
      )}

      {(error || problems.length > 0) && (
        <ul className="mt-2 space-y-1 text-sm font-semibold text-red-700" role="alert">
          {error && <li>{error}</li>}
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {items.map((item, i) => (
            <li key={item.key} className={`group relative aspect-square animate-pop-in overflow-hidden rounded-xl border-2 border-ink bg-brand-50 shadow-pop-sm ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
              <img
                src={item.kind === 'new' ? item.preview : getPublicUrl(item.path)}
                alt={`Photo ${i + 1}`}
                className="size-full object-cover"
              />
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded-md border-2 border-ink bg-sun px-1.5 text-xs font-bold text-ink">Cover</span>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => makeCover(item.key)}
                  className="absolute bottom-1 left-1 rounded-md border-2 border-ink bg-white px-1.5 text-xs font-bold text-ink opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  Make cover
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(item.key)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-red-400 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
