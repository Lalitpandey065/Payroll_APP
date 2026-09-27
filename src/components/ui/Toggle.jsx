import React, { useId } from 'react';

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  id
}) {
  const toggleId = id || useId();
  return (
    <div className="relative inline-block w-9 h-5 align-middle select-none transition duration-200 ease-in">
      <input
        type="checkbox"
        id={toggleId}
        checked={checked}
        onChange={e => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="switch-input absolute opacity-0 w-0 h-0"
      />
      <label
        htmlFor={toggleId}
        className={`switch-label block overflow-hidden h-5 w-9 rounded-full bg-slate-300 dark:bg-slate-700 cursor-pointer relative transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
}
