import React from 'react';

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'primary',
  className = ''
}) {
  const textColors = {
    primary: 'text-[var(--accent)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
    info: 'text-[var(--info)]'
  };

  const bgColors = {
    primary: 'bg-[var(--accent-light)]',
    success: 'bg-[var(--success-light)]',
    warning: 'bg-[var(--warning-light)]',
    danger: 'bg-[var(--danger-light)]',
    info: 'bg-[var(--info-light)]'
  };

  return (
    <div className={`custom-card p-5 flex items-center justify-between transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md ${className}`}>
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {title}
        </span>
        <span className={`text-2xl font-bold font-mono ${textColors[variant]}`}>
          {value}
        </span>
        {description && (
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {description}
          </span>
        )}
      </div>
      
      {Icon && (
        <div className={`p-3 rounded-lg ${bgColors[variant]}`}>
          <Icon className={`w-6 h-6 ${textColors[variant]}`} />
        </div>
      )}
    </div>
  );
}
