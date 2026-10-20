import React from 'react';
import { cn } from './utils';

export interface ProgressRingProps {
  current: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  current,
  total = 100,
  size = 72,
  strokeWidth = 6,
  color = '#0d315c',
  className = '',
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (current / (total || 1)) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center select-none', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-line dark:text-slate-800"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-sm font-bold text-ink leading-none">
          {current}
        </span>
        {label ? (
          <span className="text-[9px] font-semibold text-ink-faint mt-0.5">{label}</span>
        ) : total !== 100 ? (
          <span className="text-[9px] font-semibold text-ink-faint mt-0.5">of {total}</span>
        ) : null}
      </div>
    </div>
  );
};

export default ProgressRing;
