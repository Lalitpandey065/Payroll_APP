import React from 'react';

/**
 * Props:
 *  value    : 1 | 0
 *  onChange : fn(newValue: 0|1)
 *  size     : 'sm' | 'md'
 */
export function YesNoSelect({ value, onChange, size = 'md' }) {
  return (
    <div className={`yesno-wrap yesno-wrap--${size}`}>
      <span className={`yesno-badge ${value ? 'yesno-badge--yes' : 'yesno-badge--no'}`}>
        {value ? '✓' : '✕'}
      </span>
      <select
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="yesno-select"
      >
        <option value={1}>Yes</option>
        <option value={0}>No</option>
      </select>
    </div>
  );
}
