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
        <span className="text-sm font-medium text-slate-700" id={`${inputId}-label`}>
          Photos
        </span>
        <span className="text-xs text-slate-400 tabular-nums">
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus-within:ring-2 focus-within:ring-brand-500 ${
            dragging ? 'border-brand-500 bg-brand-50' : error ? 'border-red-300 bg-red-50/40' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
          } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          <UploadIcon className="mb-2 size-8 text-brand-600" />
          <span className="text-sm font-semibold text-slate-800">
            <span className="text-brand-600">Choose photos</span> or drag them here
          </span>
          <span className="mt-1 text-xs text-slate-500">JPG, PNG or WebP · up to 10 MB each · max {MAX_IMAGES}</span>
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
        <ul className="mt-2 space-y-1 text-sm text-red-600" role="alert">
          {error && <li>{error}</li>}
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {items.map((item, i) => (
            <li key={item.key} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={item.kind === 'new' ? item.preview : getPublicUrl(item.path)}
                alt={`Photo ${i + 1}`}
                className="size-full object-cover"
              />
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => makeCover(item.key)}
                  className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 opacity-100 shadow sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  Make cover
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(item.key)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
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
