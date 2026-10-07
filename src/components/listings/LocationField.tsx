import { useEffect, useId, useState } from 'react';
import { geocode, type GeocodeResult } from '../../services/geocodingService';
import { LIMITS } from '../../utils/constants';
import { fieldClasses } from '../ui/Input';
import Button from '../ui/Button';
import { CheckIcon, MapPinIcon } from '../ui/Icons';
import type { LocationValue } from '../../types';

type Status = 'idle' | 'searching' | 'found' | 'notfound' | 'error';

interface LocationFieldProps {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  error?: string;
  disabled?: boolean;
}

export default function LocationField({ value, onChange, error, disabled }: LocationFieldProps) {
  const id = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [match, setMatch] = useState<GeocodeResult | null>(null);
  const [cooldown, setCooldown] = useState(false);

  // Nominatim usage policy: max 1 request per second.
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(false), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const hasPin = value.latitude !== null && value.longitude !== null;

  const find = async () => {
    const q = value.location_name.trim();
    if (!q || cooldown) return;
    setCooldown(true);
    setStatus('searching');
    setMatch(null);
    try {
      const result = await geocode(q);
      if (result) {
        setMatch(result);
        setStatus('found');
      } else setStatus('notfound');
    } catch {
      setStatus('error');
    }
  };

  const use = () => {
    if (!match) return;
    onChange({ ...value, latitude: match.latitude, longitude: match.longitude });
    setStatus('idle');
    setMatch(null);
  };

  const clear = () => {
    onChange({ ...value, latitude: null, longitude: null });
    setStatus('idle');
    setMatch(null);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink">
        Meet-up location <span className="font-medium text-slate-600">(optional)</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-brand-600" />
          <input
            id={id}
            type="text"
            value={value.location_name}
            maxLength={LIMITS.locationMax}
            disabled={disabled}
            placeholder="e.g. Near NMIT Main Gate, Bengaluru"
            aria-describedby={`${id}-hint`}
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              // Coordinates no longer match a changed place name.
              onChange({ location_name: e.target.value, latitude: null, longitude: null });
              if (status !== 'idle') setStatus('idle');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                find();
              }
            }}
            className={`${fieldClasses(!!error)} pl-10`}
          />
        </div>
        <Button
          variant="secondary"
          onClick={find}
          disabled={disabled || cooldown || !value.location_name.trim()}
          loading={status === 'searching'}
          loadingText="Finding..."
        >
          Find location
        </Button>
      </div>

      {error && <p className="mt-1.5 text-sm font-semibold text-red-700">{error}</p>}
      <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-slate-600">
        Use a campus landmark, not your home address. Coordinates are rounded to about 100 m.
      </p>

      <div aria-live="polite">
        {hasPin && status === 'idle' && (
          <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-mint-soft px-3 py-2 text-sm font-semibold text-ink">
            <CheckIcon className="size-4" /> Map pin set ({value.latitude}, {value.longitude})
            <button type="button" onClick={clear} className="ml-1 font-bold underline decoration-2 underline-offset-2 hover:text-red-700">
              Remove
            </button>
          </p>
        )}
        {status === 'found' && match && (
          <div className="mt-3 animate-pop-in rounded-xl border-2 border-ink bg-mint-soft p-3 text-sm shadow-pop-sm">
            <p className="text-ink">
              <span className="font-semibold">✓ Matched:</span> {match.label}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={use}>
                Use
              </Button>
              <Button size="sm" variant="ghost" onClick={clear}>
                Clear
              </Button>
            </div>
          </div>
        )}
        {status === 'notfound' && (
          <p className="mt-3 rounded-xl border-2 border-ink bg-sun-soft p-3 text-sm font-semibold text-ink">
            Couldn't find that place. Try adding your campus or city name. You can still post without coordinates.
          </p>
        )}
        {status === 'error' && (
          <p className="mt-3 rounded-xl border-2 border-ink bg-tangerine-soft p-3 text-sm font-semibold text-ink">
            Location service unavailable. Your listing will be saved without a map pin.
          </p>
        )}
      </div>
    </div>
  );
}
