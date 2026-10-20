import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../ui/utils';

export const APP_NAME = 'Software Hub';
export const SUBTITLE = 'Central Operations Platform';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  className?: string;
}

const HEIGHT = { sm: 'h-8', md: 'h-10', lg: 'h-14' } as const;

export function Logo({ size = 'md', inverted = false, className }: LogoProps) {
  return (
    <span role="img" aria-label={APP_NAME} className={cn('inline-flex items-center gap-2.5 select-none', HEIGHT[size], className)}>
      <span
        aria-hidden
        className={cn(
          'flex aspect-square h-full items-center justify-center rounded-control font-display font-black tracking-tight',
          inverted
            ? 'bg-white text-navy-800'
            : 'bg-linear-to-br from-navy-800 to-navy-950 text-white shadow-xs ring-1 ring-gold-400/50',
          size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs'
        )}
      >
        SH
      </span>
      <div className="flex flex-col">
        <span
          aria-hidden
          className={cn(
            'font-display leading-tight font-bold tracking-tight',
            inverted ? 'text-white' : 'text-navy-800 dark:text-white',
            size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          )}
        >
          {APP_NAME}
        </span>
        {size !== 'sm' && (
          <span
            aria-hidden
            className={cn(
              'font-sans text-[10px] sm:text-[11px] font-medium leading-none mt-0.5',
              inverted ? 'text-navy-200' : 'text-ink-faint'
            )}
          >
            {SUBTITLE}
          </span>
        )}
      </div>
    </span>
  );
}

export interface BrandProps {
  to?: string;
  compact?: boolean;
}

export function Brand({ to = '/', compact = false }: BrandProps) {
  return (
    <Link
      to={to}
      className="flex min-w-0 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-500"
    >
      <Logo size={compact ? 'sm' : 'md'} />
    </Link>
  );
}

export default Brand;
