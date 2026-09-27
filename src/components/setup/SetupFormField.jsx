import React from 'react';

/**
 * Props:
 *  label       : string — field label (uppercase, as in reference)
 *  required    : bool   — shows red asterisk
 *  helper      : string — small text below field
 *  error       : string — validation error message
 *  warning     : string — amber warning (non-blocking)
 *  success     : string — green confirmation message
 *  computed    : bool   — field is auto-computed (shows formula icon + amber bg)
 *  children    : ReactNode — the actual input element
 */
export function SetupFormField({ label, required, helper, error, warning, success, computed, children }) {
  return (
    <div className="setup-field">
      {label && (
        <label className="setup-field__label">
          {label}
          {required && <span className="setup-field__required">*</span>}
          {computed && <span className="setup-field__computed-badge" title="Auto-computed">ƒ</span>}
        </label>
      )}
      <div className={`setup-field__input-wrap ${computed ? 'setup-field__input-wrap--computed' : ''} ${error ? 'setup-field__input-wrap--error' : ''}`}>
        {children}
      </div>
      {error   && <p className="setup-field__msg setup-field__msg--error">  ⚠ {error}</p>}
      {warning && <p className="setup-field__msg setup-field__msg--warning">◎ {warning}</p>}
      {success && <p className="setup-field__msg setup-field__msg--success">✓ {success}</p>}
      {helper  && !error && !warning && <p className="setup-field__msg setup-field__msg--helper">{helper}</p>}
    </div>
  );
}
