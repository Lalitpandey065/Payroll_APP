import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Props:
 *  title      : string
 *  subtitle   : string
 *  icon       : ReactNode (lucide icon)
 *  action     : ReactNode (e.g. a reset button)
 *  collapsible: bool — allow collapse/expand
 *  defaultOpen: bool — default collapsed state
 *  children   : ReactNode
 */
export function SetupSection({ title, subtitle, icon, action, collapsible = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="setup-section">
      <div className="setup-section__header" onClick={() => collapsible && setOpen(o => !o)} style={{ cursor: collapsible ? 'pointer' : 'default' }}>
        <div className="setup-section__header-left">
          {icon && <span className="setup-section__icon">{icon}</span>}
          <div>
            <h3 className="setup-section__title">{title}</h3>
            {subtitle && <p className="setup-section__subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="setup-section__header-right" onClick={e => e.stopPropagation()}>
          {action}
          {collapsible && (
            <button type="button" className="setup-section__collapse-btn">
              {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          )}
        </div>
      </div>
      {open && <div className="setup-section__body">{children}</div>}
    </div>
  );
}
