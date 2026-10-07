import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export const fieldClasses = (hasError?: boolean) =>
  [
    'block min-h-11 w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-base font-medium text-ink transition-[box-shadow,background-color] duration-150 sm:text-sm',
    'placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500',
    hasError
      ? 'border-red-600 bg-red-50 shadow-[3px_3px_0_0_#dc2626] focus:shadow-[4px_4px_0_0_#dc2626]'
      : 'border-ink shadow-pop-sm focus:bg-brand-50 focus:shadow-[4px_4px_0_0_#7c3aed]',
  ].join(' ');

export function FieldWrapper({
  id,
  label,
  error,
  hint,
  children,
  className = '',
  trailing,
}: {
  id: string;
  label?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="block text-sm font-bold text-ink">
            {label}
          </label>
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export default function Input({ label, error, hint, id, wrapperClassName, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint} className={wrapperClassName}>
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${fieldClasses(!!error)} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}
