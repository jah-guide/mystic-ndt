import React from 'react';
import { getResultBadgeClass, getStatusBadgeClass, getMethodColor } from '../../utils/formatters';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'result' | 'method' | 'warning' | 'info' | 'neutral';
  value?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  value,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium rounded',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-md',
    lg: 'px-3 py-1.5 text-sm font-bold rounded-lg'
  };

  let colorClass = 'bg-slate-800 text-slate-300 border border-slate-700';

  if (variant === 'result' && value) {
    colorClass = getResultBadgeClass(value);
  } else if (variant === 'status' && value) {
    colorClass = getStatusBadgeClass(value);
  } else if (variant === 'method' && value) {
    colorClass = getMethodColor(value);
  } else if (variant === 'warning') {
    colorClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
  } else if (variant === 'info') {
    colorClass = 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 leading-none transition-all shadow-sm ${sizeClasses[size]} ${colorClass} ${className}`}>
      {children}
    </span>
  );
};
