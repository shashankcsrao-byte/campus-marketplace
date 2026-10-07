import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { FieldWrapper, fieldClasses } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  showCount?: boolean;
  wrapperClassName?: string;
}

export default function Textarea({
  label,
  error,
  hint,
  id,
  showCount,
  maxLength,
  value,
  wrapperClassName,
  className = '',
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <FieldWrapper
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      className={wrapperClassName}
      trailing={
        showCount && maxLength ? (
          <span className={`text-xs tabular-nums ${length > maxLength * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
            {length}/{maxLength}
          </span>
        ) : null
      }
    >
      <textarea
        id={inputId}
        value={value}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${fieldClasses(!!error)} min-h-32 resize-y ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}
