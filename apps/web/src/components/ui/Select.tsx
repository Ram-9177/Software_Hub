import React, { type ComponentProps, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { controlClass, useFieldControl } from './Field';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  options?: readonly SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  controlSize?: 'sm' | 'md';
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      invalid: invalidProp,
      controlSize = 'md',
      className,
      wrapperClassName,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const isInvalid = invalidProp ?? !!error;
    const { controlProps } = useFieldControl({ id, ...props }, isInvalid);
    const isSm = controlSize === 'sm';

    const selectNode = (
      <div className={cn('relative rounded-control', wrapperClassName)}>
        <select
          ref={ref}
          {...props}
          {...controlProps}
          className={cn(
            controlClass,
            isSm
              ? 'h-9.5 cursor-pointer appearance-none pr-8 pl-2.5 text-sm'
              : 'h-11 cursor-pointer appearance-none pr-10 pl-3.5 text-sm',
            error && 'border-danger-600 focus:ring-danger-600/15',
            className
          )}
        >
          {placeholder !== undefined && (
            <option value="" disabled={!!controlProps.required}>
              {placeholder}
            </option>
          )}
          {options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-faint',
            isSm ? 'size-4' : 'size-4.5'
          )}
        />
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
          {selectNode}
          {error && <p className="text-xs font-medium text-danger-600">{error}</p>}
          {!error && helperText && <p className="text-xs text-ink-faint">{helperText}</p>}
        </div>
      );
    }

    return selectNode;
  }
);

Select.displayName = 'Select';
export default Select;
