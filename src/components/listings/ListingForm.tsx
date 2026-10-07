import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { WarningIcon } from '../ui/Icons';
import ImageUploader from './ImageUploader';
import LocationField from './LocationField';
import { CATEGORIES, LIMITS, type Category } from '../../utils/constants';
import { validateListing, type FieldErrors, type ListingFormInput } from '../../utils/validation';
import { toUserMessage } from '../../utils/errorMessages';
import type { ImageItem, Listing, ListingInput, LocationValue } from '../../types';

interface ListingFormProps {
  initial?: Listing;
  submitLabel: string;
  progressLabel?: string;
  onSubmit: (input: ListingInput, images: ImageItem[]) => Promise<void>;
  onCancel?: () => void;
}

export default function ListingForm({ initial, submitLabel, progressLabel, onSubmit, onCancel }: ListingFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [category, setCategory] = useState<string>(initial?.category ?? '');
  const [location, setLocation] = useState<LocationValue>({
    location_name: initial?.location_name ?? '',
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
  });
  const [images, setImages] = useState<ImageItem[]>(
    () => initial?.image_paths.map((path) => ({ kind: 'existing' as const, key: path, path })) ?? [],
  );
  const [errors, setErrors] = useState<FieldErrors<keyof ListingFormInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateListing({
      title,
      description,
      price,
      category,
      location_name: location.location_name,
      imageCount: images.length,
    });
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const locationName = location.location_name.trim();
    setSubmitting(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          category: category as Category,
          location_name: locationName || null,
          latitude: locationName ? location.latitude : null,
          longitude: locationName ? location.longitude : null,
        },
        images,
      );
    } catch (err) {
      setFormError(toUserMessage(err));
      setSubmitting(false);
    }
  };

  const clearError = (k: keyof ListingFormInput) => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="flex animate-pop-in items-start gap-3 rounded-2xl border-2 border-ink bg-red-300 p-4 text-sm font-bold text-ink shadow-pop">
          <WarningIcon className="mt-0.5 size-5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <section className="card-pop space-y-5 p-5 sm:p-6">
        <StepTitle n={1} tint="bg-sky" title="Add photos" subtitle="Bright, clear photos sell faster. The first one is the cover." />
        <div data-field="imageCount">
          <ImageUploader
            items={images}
            onChange={(next) => {
              setImages(next);
              clearError('imageCount');
            }}
            error={errors.imageCount}
            disabled={submitting}
          />
        </div>
      </section>

      <section className="card-pop space-y-5 p-5 sm:p-6">
        <StepTitle n={2} tint="bg-sun" title="Describe it" subtitle="What is it, what condition, and what's the price?" />
        <div data-field="title">
          <Input
            label="Title"
            value={title}
            maxLength={LIMITS.titleMax}
            placeholder="e.g. Casio fx-991EX scientific calculator"
            onChange={(e) => {
              setTitle(e.target.value);
              clearError('title');
            }}
            error={errors.title}
            disabled={submitting}
          />
        </div>
        <div data-field="description">
          <Textarea
            label="Description"
            value={description}
            maxLength={LIMITS.descriptionMax}
            showCount
            rows={6}
            placeholder="Condition, age, what's included, reason for selling..."
            onChange={(e) => {
              setDescription(e.target.value);
              clearError('description');
            }}
            error={errors.description}
            hint={`At least ${LIMITS.descriptionMin} characters.`}
            disabled={submitting}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="price">
            <Input
              label="Price (₹)"
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMITS.priceMax}
              step={1}
              value={price}
              placeholder="500"
              onChange={(e) => {
                setPrice(e.target.value);
                clearError('price');
              }}
              error={errors.price}
              disabled={submitting}
            />
          </div>
          <div data-field="category">
            <Select
              label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                clearError('category');
              }}
              error={errors.category}
              disabled={submitting}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="card-pop space-y-5 p-5 sm:p-6" data-field="location_name">
        <StepTitle n={3} tint="bg-mint" title="Where to meet" subtitle="Pick a public spot on campus." />
        <LocationField value={location} onChange={setLocation} error={errors.location_name} disabled={submitting} />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" loading={submitting} loadingText={progressLabel || 'Saving...'} className="sm:min-w-48">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function StepTitle({ n, tint, title, subtitle }: { n: number; tint: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className={`flex size-10 shrink-0 -rotate-6 items-center justify-center rounded-xl border-2 border-ink font-display text-lg font-bold text-ink shadow-pop-sm ${tint}`}>
        {n}
      </span>
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="text-sm font-medium text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}
