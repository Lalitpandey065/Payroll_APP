import React from 'react';
import Toggle from './Toggle';

export default function FlagRow({
  label,
  helperText,
  checked,
  onChange,
  disabled = false,
  className = ''
}) {
  return (
    <div className={`flex items-start justify-between py-3.5 border-b border-[var(--border)] last:border-b-0 ${className}`}>
      <div className="flex flex-col space-y-0.5 max-w-[80%]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        {helperText && (
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            {helperText}
          </span>
        )}
      </div>
      
      <div className="flex items-center pt-0.5">
        <Toggle
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
