import React from 'react';
import { cn } from './utils';

export interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'navy' | 'current';
  decorative?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-9 border-[3px]',
} as const;

const TONES = {
  navy: 'border-navy-200 border-t-navy-800',
  current: 'border-current/30 border-t-current',
} as const;

/** Indeterminate loading indicator. */
export function Spinner({ label = 'Loading', size = 'md', tone = 'navy', decorative = false, className }: SpinnerProps) {
  return (
    <span
      {...(decorative ? { 'aria-hidden': true } : { role: 'status', 'aria-label': label })}
      className={cn('inline-block shrink-0 animate-spin rounded-full', SIZES[size], TONES[tone], className)}
    />
  );
}
