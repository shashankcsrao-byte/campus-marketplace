import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export const fieldClasses = (hasError?: boolean) =>
  [
    'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition sm:text-sm',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
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
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
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
