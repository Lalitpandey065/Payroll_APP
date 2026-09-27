import React from 'react';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  icon: Icon = null,
  size = 'md',
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  const variants = {
    primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white focus:ring-[var(--accent)] border border-transparent',
    secondary: 'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] focus:ring-[var(--text-muted)]',
    success: 'bg-[var(--success)] hover:bg-emerald-700 text-white focus:ring-[var(--success)] border border-transparent',
    danger: 'bg-[var(--danger)] hover:bg-red-700 text-white focus:ring-[var(--danger)] border border-transparent'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={`mr-2 ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
      {children}
    </button>
  );
}
