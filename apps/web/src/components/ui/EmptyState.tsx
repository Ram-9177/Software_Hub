import React, { type ElementType, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  titleAs?: 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  titleAs: Title = 'p',
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as unknown as LucideIcon;
    if (typeof IconComp === 'function' || typeof IconComp === 'object') {
      return <IconComp aria-hidden className={compact ? 'size-5' : 'size-7'} />;
    }
    return null;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center select-none',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-10 sm:py-12',
        className
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-tint text-navy-700 shadow-xs border border-navy-200/50',
            compact ? 'size-10' : 'size-14'
          )}
        >
          {renderIcon()}
        </span>
      )}
      <div className="max-w-md">
        <Title className={cn('font-display font-semibold text-navy-800 dark:text-white', compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg')}>
          {title}
        </Title>
        {description && <div className="mt-1 text-xs sm:text-sm text-ink-soft leading-relaxed">{description}</div>}
      </div>
      {(action || actionLabel || secondaryActionLabel) && (
        <div className="mt-2 flex flex-wrap justify-center items-center gap-2.5">
          {action}
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
