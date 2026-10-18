import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantClass = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4 my-1',
  }[variant];

  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`animate-pulse bg-slate-200 dark:bg-slate-800/80 ${variantClass} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <Skeleton height={20} width="40%" />
      <Skeleton height={36} width="60%" />
      {Array.from({ length: rows - 2 }).map((_, i) => (
        <Skeleton key={i} height={14} width="85%" />
      ))}
    </div>
  );
};
