import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './utils';

export type BadgeTone =
  | 'neutral'
  | 'navy'
  | 'success'
  | 'warning'
  | 'danger'
  | 'violet'
  | 'teal'
  | 'sky'
  | 'amber'
  | 'indigo'
  | 'gold'
  | 'mint'
  | 'rose';

export type BadgeVariant =
  | BadgeTone
  | 'default'
  | 'primary'
  | 'institutional'
  | 'info'
  | 'purple'
  | 'done'
  | 'in_progress'
  | 'in_review'
  | 'overdue'
  | 'to_do';

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-canvas text-ink-soft ring-line dark:bg-navy-900/60 dark:text-slate-300 dark:ring-navy-700/60', dot: 'bg-ink-faint' },
  navy: { badge: 'bg-navy-50 text-navy-800 ring-navy-200 dark:bg-navy-900/80 dark:text-navy-200 dark:ring-navy-700', dot: 'bg-navy-700 dark:bg-navy-300' },
  success: { badge: 'bg-accent-50 text-accent-800 ring-accent-100 dark:bg-accent-950/60 dark:text-accent-300 dark:ring-accent-800/60', dot: 'bg-accent-600' },
  warning: { badge: 'bg-gold-100 text-gold-800 ring-gold-300/50 dark:bg-gold-950/60 dark:text-gold-300 dark:ring-gold-800/60', dot: 'bg-gold-600' },
  danger: { badge: 'bg-danger-50 text-danger-700 ring-danger-100 dark:bg-danger-950/60 dark:text-danger-300 dark:ring-danger-800/60', dot: 'bg-danger-600' },
  violet: { badge: 'bg-purple-50 text-purple-800 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800/60', dot: 'bg-purple-600' },
  teal: { badge: 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800/60', dot: 'bg-teal-600' },
  sky: { badge: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60', dot: 'bg-sky-600' },
  amber: { badge: 'bg-amber-50 text-amber-800 ring-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60', dot: 'bg-amber-600' },
  indigo: { badge: 'bg-indigo-50 text-indigo-800 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/60', dot: 'bg-indigo-600' },
  gold: { badge: 'bg-gold-100 text-gold-900 ring-gold-300/60 dark:bg-gold-950/60 dark:text-gold-300 dark:ring-gold-800/60', dot: 'bg-gold-600' },
  mint: { badge: 'bg-accent-50 text-accent-800 ring-accent-200/60 dark:bg-accent-950/60 dark:text-accent-300 dark:ring-accent-800/60', dot: 'bg-accent-600' },
  rose: { badge: 'bg-danger-50 text-danger-700 ring-danger-200/60 dark:bg-danger-950/60 dark:text-danger-300 dark:ring-danger-800/60', dot: 'bg-danger-600' },
};

const VARIANT_MAP: Record<string, BadgeTone> = {
  default: 'neutral',
  primary: 'navy',
  institutional: 'navy',
  done: 'success',
  in_progress: 'navy',
  in_review: 'warning',
  overdue: 'danger',
  to_do: 'neutral',
  info: 'sky',
  purple: 'violet',
};

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  tone?: BadgeTone;
  icon?: LucideIcon | ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
  colorClassName?: string;
  dotClassName?: string;
  className?: string;
}

/** Small badge with signature SMRU chamfer corners. */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  tone,
  icon,
  dot = false,
  size = 'md',
  colorClassName,
  dotClassName,
  className,
}) => {
  const chosenTone: BadgeTone = tone || (variant ? (VARIANT_MAP[variant] || (variant as BadgeTone)) : 'neutral');
  const t = TONES[chosenTone] || TONES.neutral;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as unknown as LucideIcon;
    if (typeof IconComp === 'function' || typeof IconComp === 'object') {
      return <IconComp aria-hidden className="size-3.5 shrink-0" />;
    }
    return null;
  };

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-sm font-medium whitespace-nowrap ring-1 ring-inset select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        colorClassName ?? t.badge,
        className
      )}
    >
      {icon ? (
        renderIcon()
      ) : (
        dot && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dotClassName ?? t.dot)} />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
};

export interface StatusStyle {
  badge: string;
  solid: string;
  border: string;
  text: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: {
    badge: 'bg-status-pending-bg text-status-pending ring-status-pending/20',
    solid: 'bg-status-pending',
    border: 'border-status-pending',
    text: 'text-status-pending',
  },
  approved: {
    badge: 'bg-status-approved-bg text-status-approved ring-status-approved/20',
    solid: 'bg-status-approved',
    border: 'border-status-approved',
    text: 'text-status-approved',
  },
  rejected: {
    badge: 'bg-status-rejected-bg text-status-rejected ring-status-rejected/20',
    solid: 'bg-status-rejected',
    border: 'border-status-rejected',
    text: 'text-status-rejected',
  },
  completed: {
    badge: 'bg-status-completed-bg text-status-completed ring-status-completed/20',
    solid: 'bg-status-completed',
    border: 'border-status-completed',
    text: 'text-status-completed',
  },
};

export default Badge;
