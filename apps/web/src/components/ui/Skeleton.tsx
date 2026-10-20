import React from 'react';
import { cn } from './utils';

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
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded-sm h-4 my-1',
  }[variant];

  return (
    <span
      aria-hidden="true"
      style={{ width, height }}
      className={cn('block animate-pulse bg-line/90 dark:bg-slate-800', variantClass, className)}
    />
  );
};

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </span>
  );
}

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-5 rounded-card border border-line/70 bg-surface shadow-card space-y-3">
      <Skeleton height={20} width="40%" />
      <Skeleton height={36} width="60%" />
      {Array.from({ length: Math.max(0, rows - 2) }).map((_, i) => (
        <Skeleton key={i} height={14} width="85%" />
      ))}
    </div>
  );
};

export default Skeleton;
