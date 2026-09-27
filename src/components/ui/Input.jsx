import React, { forwardRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  helperText,
  className = '',
  required = false,
  showCount = false,
  maxLength,
  ...props
}, ref) => {
  const charCount = String(value ?? '').length;

  return (
    <div className={`flex flex-col space-y-1 w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            {label} {required && <span className="text-[var(--danger)]">*</span>}
          </label>
          {showCount && maxLength && (
            <span className={`text-[10px] font-mono font-semibold ${
              charCount === maxLength ? 'text-[var(--success)]' :
              charCount > maxLength   ? 'text-[var(--danger)]' :
              'text-[var(--text-muted)]'
            }`}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          maxLength={maxLength}
          className={`w-full text-sm py-2 px-3 rounded-md focus:outline-none border transition-all duration-150 text-[var(--text-primary)]
            ${success && !error
              ? 'border-[var(--success)] focus:ring-[var(--success)] bg-[var(--success-light)] pr-8'
              : error
                ? 'border-[var(--danger)] focus:ring-[var(--danger)] bg-[var(--danger-light)]'
                : 'border-[var(--border-strong)] focus:ring-[var(--accent)] bg-[var(--bg-surface)]'
            } focus:ring-1`}
          {...props}
        />
        {success && !error && (
          <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--success)] pointer-events-none" />
        )}
      </div>
      {error     && <span className="text-xs text-[var(--danger)] font-medium flex items-center gap-1"><span>⚠</span>{error}</span>}
      {!error && helperText && <span className="text-xs text-[var(--text-muted)]">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
