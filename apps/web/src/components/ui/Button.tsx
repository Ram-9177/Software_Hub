import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Spinner } from './Spinner';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium ' +
  'transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed active:scale-[0.98]';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-navy-800 text-white shadow-xs hover:bg-navy-700 active:bg-navy-900 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white disabled:bg-navy-300 disabled:shadow-none ' +
    'aria-busy:bg-navy-800 aria-busy:cursor-progress',
  secondary:
    'border border-navy-800 bg-surface text-navy-800 hover:bg-navy-50 active:bg-navy-100 ' +
    'dark:border-navy-400/80 dark:bg-navy-900/80 dark:text-navy-100 dark:hover:bg-navy-800 ' +
    'disabled:border-line-strong disabled:bg-surface disabled:text-ink-faint ' +
    'aria-busy:border-navy-800 aria-busy:text-navy-800 aria-busy:cursor-progress',
  outline:
    'border border-navy-800 bg-surface text-navy-800 hover:bg-navy-50 active:bg-navy-100 ' +
    'dark:border-navy-400/80 dark:bg-navy-900/80 dark:text-navy-100 dark:hover:bg-navy-800 ' +
    'disabled:border-line-strong disabled:bg-surface disabled:text-ink-faint ' +
    'aria-busy:border-navy-800 aria-busy:text-navy-800 aria-busy:cursor-progress',
  ghost:
    'text-navy-800 hover:bg-navy-50 active:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-900/60 disabled:bg-transparent disabled:text-ink-faint aria-busy:text-navy-800 aria-busy:cursor-progress',
  danger:
    'bg-danger-600 text-white shadow-xs hover:bg-danger-700 active:bg-danger-700 disabled:bg-danger-100 disabled:text-danger-600 ' +
    'aria-busy:bg-danger-600 aria-busy:text-white aria-busy:cursor-progress',
  success:
    'bg-accent-600 text-white shadow-xs hover:bg-accent-700 active:bg-accent-800 disabled:bg-accent-100 disabled:text-accent-600 ' +
    'aria-busy:bg-accent-600 aria-busy:text-white aria-busy:cursor-progress',
  link: 'text-navy-700 dark:text-navy-300 underline-offset-4 hover:text-navy-800 dark:hover:text-white hover:underline disabled:text-ink-faint disabled:no-underline',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs font-semibold',
  sm: 'h-9 gap-1.5 px-3 text-xs font-semibold before:absolute before:inset-x-0 before:-inset-y-1 before:content-[""]',
  md: 'h-11 gap-2 px-4 text-sm font-semibold',
  lg: 'h-12 gap-2.5 px-6 text-base font-semibold',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

export function buttonStyles({ variant = 'primary', size = 'md', fullWidth, className }: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], variant === 'link' ? 'h-auto gap-1.5 px-0 text-sm' : SIZES[size], fullWidth && 'w-full', className);
}

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode | LucideIcon;
  rightIcon?: ReactNode | LucideIcon;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isBusy = loading || isLoading;

    const renderIcon = (icon: ReactNode | LucideIcon | undefined) => {
      if (!icon) return null;
      if (React.isValidElement(icon)) return icon;
      const IconComponent = icon as unknown as LucideIcon;
      if (typeof IconComponent === 'function' || typeof IconComponent === 'object') {
        const iconSizeClass = size === 'xs' || size === 'sm' ? 'size-4' : size === 'lg' ? 'size-5' : 'size-4.5';
        return <IconComponent aria-hidden className={cn('shrink-0', iconSizeClass)} />;
      }
      return null;
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        className={buttonStyles({ variant, size, fullWidth, className })}
        {...props}
      >
        {isBusy ? (
          <Spinner size={size === 'xs' || size === 'sm' ? 'sm' : 'sm'} tone="current" decorative />
        ) : (
          renderIcon(leftIcon)
        )}
        {isBusy && loadingText ? loadingText : children ? <span>{children}</span> : null}
        {!isBusy && renderIcon(rightIcon)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  'aria-label': string;
  icon: LucideIcon;
  variant?: Exclude<ButtonVariant, 'link'>;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
}

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'size-7',
  sm: 'size-9 before:absolute before:-inset-1 before:content-[""]',
  md: 'size-11',
  lg: 'size-12',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-4.5',
  lg: 'size-5',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      loading = false,
      isLoading = false,
      disabled,
      className,
      title,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isBusy = loading || isLoading;
    return (
      <button
        ref={ref}
        type={type}
        title={title ?? props['aria-label']}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        className={cn(BASE, VARIANTS[variant], ICON_BUTTON_SIZES[size], 'shrink-0 p-0', className)}
        {...props}
      >
        {isBusy ? <Spinner size="sm" tone="current" decorative /> : <Icon aria-hidden className={ICON_SIZES[size]} />}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
export default Button;
