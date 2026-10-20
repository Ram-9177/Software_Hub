import React, { type ComponentProps, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { controlClass, useFieldControl } from './Field';
import { cn } from './utils';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  leftIcon?: ReactNode | LucideIcon;
  rightIcon?: ReactNode | LucideIcon;
  rightElement?: ReactNode;
  invalid?: boolean;
  controlSize?: 'sm' | 'md';
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      rightElement,
      invalid: invalidProp,
      controlSize = 'md',
      className,
      wrapperClassName,
      id,
      ...props
    },
    ref
  ) => {
    const isInvalid = invalidProp ?? !!error;
    const { controlProps } = useFieldControl({ id, ...props }, isInvalid);
    const isSm = controlSize === 'sm';

    const renderIcon = (icon: ReactNode | LucideIcon | undefined, isRight = false) => {
      if (!icon) return null;
      if (React.isValidElement(icon)) {
        return (
          <div className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint flex items-center justify-center', isRight ? 'right-3' : 'left-3', isSm ? 'size-4' : 'size-4.5')}>
            {icon}
          </div>
        );
      }
      const IconComp = icon as unknown as LucideIcon;
      if (typeof IconComp === 'function' || typeof IconComp === 'object') {
        return (
          <IconComp
            aria-hidden
            className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint', isRight ? 'right-3' : 'left-3', isSm ? 'size-4' : 'size-4.5')}
          />
        );
      }
      return null;
    };

    const inputNode = (
      <div className={cn('relative rounded-control', wrapperClassName)}>
        {renderIcon(leftIcon, false)}
        <input
          ref={ref}
          {...props}
          {...controlProps}
          className={cn(
            controlClass,
            isSm ? 'h-9.5 px-2.5 text-sm' : 'h-11 px-3.5 text-sm',
            leftIcon && (isSm ? 'pl-9' : 'pl-10'),
            (rightElement || rightIcon) ? (isSm ? 'pr-10' : 'pr-12') : null,
            error && 'border-danger-600 focus:ring-danger-600/15',
            className
          )}
        />
        {rightElement ? (
          <div className="absolute inset-y-0 right-1 flex items-center pr-2 text-ink-faint">
            {rightElement}
          </div>
        ) : (
          renderIcon(rightIcon, true)
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <div className="w-full flex flex-col gap-1.5">
          {label && (
            <label htmlFor={controlProps.id} className="text-xs font-semibold text-ink sm:text-sm">
              {label}
              {props.required && <span className="ml-0.5 text-danger-600">*</span>}
            </label>
          )}
          {inputNode}
          {error && <p className="text-xs font-medium text-danger-600">{error}</p>}
          {!error && helperText && <p className="text-xs text-ink-faint">{helperText}</p>}
        </div>
      );
    }

    return inputNode;
  }
);

Input.displayName = 'Input';
export default Input;
