import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { FieldWrapper, fieldClasses } from './Input';
import { ChevronDownIcon } from './Icons';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export default function Select({ label, error, hint, id, wrapperClassName, className = '', children, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint} className={wrapperClassName}>
      <div className="relative">
        <select
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${fieldClasses(!!error)} appearance-none pr-10 ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </FieldWrapper>
  );
}
