import React from 'react';

export default function Badge({
  status = 'active',
  className = '',
  children
}) {
  const normalized = status.toLowerCase();

  const colorStyles = {
    // Approved / Active / Locked -> green
    active: 'bg-[var(--success-light)] text-[var(--success)]',
    approved: 'bg-[var(--success-light)] text-[var(--success)]',
    locked: 'bg-[var(--success-light)] text-[var(--success)]',
    
    // Draft / Pending -> amber
    draft: 'bg-[var(--warning-light)] text-[var(--warning)]',
    pending: 'bg-[var(--warning-light)] text-[var(--warning)]',
    under_review: 'bg-[var(--warning-light)] text-[var(--warning)]',
    
    // Danger / Cancelled / Error -> red
    error: 'bg-[var(--danger-light)] text-[var(--danger)]',
    missing: 'bg-[var(--danger-light)] text-[var(--danger)]',
    cancelled: 'bg-[var(--danger-light)] text-[var(--danger)]',
    
    // Info / Syncing -> cyan
    info: 'bg-[var(--info-light)] text-[var(--info)]',
    syncing: 'bg-[var(--info-light)] text-[var(--info)]',

    // Inactive / Separated -> muted gray
    inactive: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]',
    separated: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'
  };

  const currentStyle = colorStyles[normalized] || 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${currentStyle} ${className}`}>
      {children || status}
    </span>
  );
}
