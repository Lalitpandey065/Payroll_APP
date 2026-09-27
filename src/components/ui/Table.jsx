import React from 'react';

export default function Table({
  headers = [], // Can be strings or { label, align }
  children,
  className = ''
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[var(--border)] ${className}`}>
      <table className="w-full text-left border-collapse bg-[var(--bg-surface)]">
        <thead>
          <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border-strong)]">
            {headers.map((h, i) => {
              const label = typeof h === 'string' ? h : h.label;
              const align = typeof h === 'string' ? 'left' : (h.align || 'left');
              const cellWidth = typeof h === 'string' ? '' : (h.width || '');
              
              const alignClass = align === 'right' 
                ? 'text-right' 
                : align === 'center' 
                  ? 'text-center' 
                  : 'text-left';

              return (
                <th 
                  key={i} 
                  style={{ width: cellWidth }}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] ${alignClass}`}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-primary)]">
          {children}
        </tbody>
      </table>
    </div>
  );
}
