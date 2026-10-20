import React, { useState, type ComponentProps, type ReactNode } from 'react';
import { controlClass, useFieldControl } from './Field';
import { cn } from './utils';

export interface TextareaProps extends ComponentProps<'textarea'> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  invalid?: boolean;
  showCount?: boolean;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      invalid: invalidProp,
      showCount,
      className,
      wrapperClassName,
      rows = 3,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const isInvalid = invalidProp ?? !!error;
    const { controlProps } = useFieldControl({ id, ...props }, isInvalid);
    const controlled = props.value !== undefined;
    const [innerLength, setInnerLength] = useState(String(props.defaultValue ?? '').length);
    const length = controlled ? String(props.value ?? '').length : innerLength;

    const textareaNode = (
      <div className={cn('rounded-control', wrapperClassName)}>
        <textarea
          ref={ref}
          rows={rows}
          {...props}
          {...controlProps}
          onChange={(e) => {
            if (!controlled) setInnerLength(e.target.value.length);
            onChange?.(e);
          }}
          className={cn(
            controlClass,
            'min-h-24 resize-y px-3 py-2.5 leading-relaxed text-sm',
            error && 'border-danger-600 focus:ring-danger-600/15',
            className
          )}
        />
        {showCount && props.maxLength !== undefined && (
          <p className="mt-1 text-right text-xs text-ink-faint tabular-nums">
            {length} / {props.maxLength}
          </p>
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
          {textareaNode}
          {error && <p className="text-xs font-medium text-danger-600">{error}</p>}
          {!error && helperText && <p className="text-xs text-ink-faint">{helperText}</p>}
        </div>
      );
    }

    return textareaNode;
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
