import React from 'react';

/**
 * Props:
 *  type     : 'info' | 'warning' | 'formula' | 'success'
 *  title    : string
 *  children : ReactNode
 */
export function SetupInfoBox({ type = 'info', title, children }) {
  const colors = {
    info:    { bg: 'var(--info-light)',    border: 'var(--info)',    icon: 'ℹ' },
    warning: { bg: 'var(--warning-light)', border: 'var(--warning)', icon: '⚠' },
    formula: { bg: 'var(--accent-light)',  border: 'var(--accent)',  icon: 'ƒ' },
    success: { bg: 'var(--success-light)', border: 'var(--success)', icon: '✓' },
  };
  const c = colors[type] || colors.info;
  return (
    <div className="setup-info-box" style={{ background: c.bg, borderLeftColor: c.border }}>
      <span className="setup-info-box__icon" style={{ color: c.border }}>{c.icon}</span>
      <div>
        {title && <p className="setup-info-box__title">{title}</p>}
        <div className="setup-info-box__body">{children}</div>
      </div>
    </div>
  );
}
