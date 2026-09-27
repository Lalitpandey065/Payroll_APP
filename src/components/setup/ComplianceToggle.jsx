import React from 'react';
import { YesNoSelect } from './YesNoSelect';

/**
 * Props:
 *  label    : string
 *  value    : 0 | 1
 *  onChange : fn(0|1)
 *  icon     : ReactNode (optional lucide icon)
 *  required : bool — if required=true and value=0, show amber warning
 */
export function ComplianceToggle({ label, value, onChange, icon, required = false }) {
  return (
    <div className={`compliance-toggle ${value ? 'compliance-toggle--active' : ''} ${required && !value ? 'compliance-toggle--warn' : ''}`}>
      <div className="compliance-toggle__left">
        {icon && <span className="compliance-toggle__icon">{icon}</span>}
        <span className="compliance-toggle__label">{label}</span>
        {required && !value && (
          <span className="compliance-toggle__required-badge">Required</span>
        )}
      </div>
      <YesNoSelect value={value} onChange={onChange} size="sm" />
    </div>
  );
}
