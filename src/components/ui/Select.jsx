import React from 'react';

export default function Select({
  label,
  options = [],
  value,
  onChange,
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col space-y-1 w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full text-sm py-2 px-3 rounded-md focus:outline-none border transition-all duration-150 bg-[var(--bg-surface)] text-[var(--text-primary)]
          ${error 
            ? 'border-[var(--danger)] focus:ring-[var(--danger)] bg-[var(--danger-light)]' 
            : 'border-[var(--border-strong)] focus:ring-[var(--accent)] bg-[var(--bg-surface)]'
          }`}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={opt.value + i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-[var(--danger)] font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-[var(--text-muted)]">{helperText}</span>}
    </div>
  );
}
