import React from 'react';
import type { ComponentProps, ElementType, ReactNode } from 'react';
import { cn } from './utils';

export interface CardProps extends ComponentProps<'div'> {
  as?: ElementType;
  padded?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

const PADDINGS = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-6',
};

/** Surface for grouped content with SMRU signature chamfer corners. */
export function Card({
  as: Comp = 'div',
  padded = false,
  padding,
  className,
  children,
  ...props
}: CardProps) {
  const padClass = padding ? PADDINGS[padding] : padded ? 'p-4 sm:p-5' : '';
  return (
    <Comp
      className={cn(
        'min-w-0 rounded-card border border-line bg-surface dark:bg-navy-900/90 dark:border-navy-800/80 shadow-card transition-all duration-150',
        padClass,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export interface CardHeaderProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
  titleId?: string;
  children?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  actions,
  titleAs: Heading = 'h2',
  titleId,
  children,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5 sm:pt-5', className)}>
      <div className="min-w-0 flex-1">
        {title && (
          <Heading id={titleId} className="text-base leading-snug font-semibold text-ink">
            {title}
          </Heading>
        )}
        {description && <p className="mt-0.5 text-xs sm:text-sm text-ink-soft">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-4 py-4 sm:px-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5', className)} {...props} />;
}

export default Card;
