import React from 'react';

/**
 * Props:
 *  title    : string
 *  rows     : [{label, value}]  — computed values to display
 *  loading  : bool
 */
export function SetupPreviewCard({ title, rows = [], loading }) {
  return (
    <div className="setup-preview">
      <p className="setup-preview__title">{title}</p>
      {loading ? (
        <div className="setup-preview__loading">Computing...</div>
      ) : (
        rows.map((row, i) => (
          <div key={i} className="setup-preview__row">
            <span className="setup-preview__label">{row.label}</span>
            <span className="setup-preview__value">{row.value}</span>
          </div>
        ))
      )}
    </div>
  );
}
