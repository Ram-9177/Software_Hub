import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from './Skeleton';
import { cn } from './utils';

const TONES = {
  navy: 'bg-navy-50 text-navy-800 ring-1 ring-navy-200/60 dark:bg-navy-900/60 dark:text-navy-200 dark:ring-navy-700/60',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/60',
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800/60',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60',
  violet: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800/60',
  success: 'bg-accent-50 text-accent-700 ring-1 ring-accent-200/60 dark:bg-accent-950/60 dark:text-accent-300 dark:ring-accent-800/60',
  warning: 'bg-gold-100 text-gold-800 ring-1 ring-gold-300/60 dark:bg-gold-950/60 dark:text-gold-300 dark:ring-gold-800/60',
  danger: 'bg-danger-50 text-danger-600 ring-1 ring-danger-200/60 dark:bg-danger-950/60 dark:text-danger-300 dark:ring-danger-800/60',
  neutral: 'bg-canvas text-ink-soft ring-1 ring-line dark:bg-navy-900/60 dark:text-ink-soft dark:ring-navy-700/60',
} as const;

const TONE_HOVER: Record<keyof typeof TONES, string> = {
  navy: 'hover:border-navy-300 hover:bg-navy-50/50 hover:shadow-navy-500/10 dark:hover:border-navy-600',
  indigo: 'hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-indigo-500/10 dark:hover:border-indigo-600',
  teal: 'hover:border-accent-300 hover:bg-accent-50/50 hover:shadow-accent-500/10 dark:hover:border-accent-600',
  amber: 'hover:border-gold-400 hover:bg-gold-50/50 hover:shadow-gold-500/10 dark:hover:border-gold-600',
  sky: 'hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-sky-500/10 dark:hover:border-sky-600',
  violet: 'hover:border-purple-300 hover:bg-purple-50/40 hover:shadow-purple-500/10 dark:hover:border-purple-600',
  success: 'hover:border-accent-400 hover:bg-accent-50/40 hover:shadow-accent-500/10 dark:hover:border-accent-600',
  warning: 'hover:border-gold-400 hover:bg-gold-50/50 hover:shadow-gold-500/10 dark:hover:border-gold-600',
  danger: 'hover:border-danger-300 hover:bg-danger-50/50 hover:shadow-danger-500/10 dark:hover:border-danger-600',
  neutral: 'hover:border-line-strong hover:bg-canvas dark:hover:border-navy-600',
};

const TONE_CARDS: Record<keyof typeof TONES, string> = {
  navy: 'border-t-3 border-t-navy-700 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  indigo: 'border-t-3 border-t-indigo-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  teal: 'border-t-3 border-t-accent-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  amber: 'border-t-3 border-t-gold-400 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  sky: 'border-t-3 border-t-sky-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  violet: 'border-t-3 border-t-purple-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  success: 'border-t-3 border-t-emerald-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  warning: 'border-t-3 border-t-gold-400 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  danger: 'border-t-3 border-t-rose-500 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
  neutral: 'border-t-3 border-t-slate-400 dark:border-t-slate-600 bg-surface dark:bg-navy-900/90 dark:border-navy-800/80',
};

const TONE_VALUE: Record<keyof typeof TONES, string> = {
  navy: 'text-navy-900 dark:text-white',
  indigo: 'text-indigo-900 dark:text-indigo-200',
  teal: 'text-teal-900 dark:text-teal-200',
  amber: 'text-amber-900 dark:text-amber-200',
  sky: 'text-sky-900 dark:text-sky-200',
  violet: 'text-purple-900 dark:text-purple-200',
  success: 'text-accent-900 dark:text-accent-200',
  warning: 'text-amber-900 dark:text-amber-200',
  danger: 'text-danger-700 dark:text-danger-300',
  neutral: 'text-ink',
};

export interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon | ReactNode;
  tone?: keyof typeof TONES;
  hint?: ReactNode;
  to?: string;
  onClick?(): void;
  loading?: boolean;
  className?: string;
}

export function StatTile({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
  to,
  onClick,
  loading = false,
  className,
}: StatTileProps) {
  const isInteractive = Boolean(to || onClick);
  const containerClasses = cn(
    'group relative flex flex-col justify-between rounded-card border border-line/70 p-3.5 sm:p-4 shadow-card transition-all duration-150',
    TONE_CARDS[tone],
    isInteractive && cn('cursor-pointer focus-visible:outline-2 focus-visible:outline-navy-500', TONE_HOVER[tone]),
    className
  );

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as unknown as LucideIcon;
    if (typeof IconComp === 'function' || typeof IconComp === 'object') {
      return <IconComp className="size-4 shrink-0 sm:size-4.5" aria-hidden />;
    }
    return null;
  };

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-soft truncate">{label}</p>
        {icon && (
          <span className={cn('flex size-7 sm:size-8 items-center justify-center rounded-control transition-colors', TONES[tone])}>
            {renderIcon()}
          </span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        {loading ? (
          <Skeleton className="mt-1 h-6 w-14 sm:mt-1.5 sm:h-7 sm:w-16" />
        ) : (
          <p className={cn('font-display text-xl leading-tight font-bold tabular-nums sm:text-2xl', TONE_VALUE[tone])}>
            {value}
          </p>
        )}
        {hint && <p className="mt-0.5 truncate text-[11px] text-ink-faint sm:text-xs">{hint}</p>}
      </div>
      {isInteractive && (
        <span className="absolute top-2.5 right-2.5 text-ink-faint/30 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-navy-700 sm:top-3.5 sm:right-3.5">
          <ArrowUpRight className="size-3.5 sm:size-4" aria-hidden />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={containerClasses}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(containerClasses, 'text-left')}>
        {inner}
      </button>
    );
  }

  return <div className={containerClasses}>{inner}</div>;
}

export default StatTile;
