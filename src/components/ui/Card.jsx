import React from 'react';

export default function Card({
  title,
  subTitle,
  headerActions,
  children,
  className = '',
  bodyClassName = ''
}) {
  return (
    <div className={`custom-card overflow-hidden ${className}`}>
      {/* Card Header */}
      {(title || subTitle || headerActions) && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--bg-surface)]">
          <div className="flex flex-col">
            {title && (
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
            )}
            {subTitle && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {subTitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className={`px-5 py-4 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
