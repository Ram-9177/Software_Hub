import { CircleAlert } from 'lucide-react';
import React, { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from './utils';

export interface FieldContextValue {
  id: string;
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

interface ControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  required?: boolean;
  disabled?: boolean;
}

export interface FieldControl {
  controlProps: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    required: boolean | undefined;
    disabled: boolean | undefined;
  };
  invalid: boolean;
  labelId: string | undefined;
}

export function useFieldControl(props: ControlProps, invalidProp?: boolean): FieldControl {
  const field = useFieldContext();
  const ownId = useId();
  const describedBy = [field?.describedBy, props['aria-describedby']].filter(Boolean).join(' ') || undefined;
  const invalid = invalidProp ?? (props['aria-invalid'] === true || props['aria-invalid'] === 'true' || !!field?.invalid);
  return {
    controlProps: {
      id: props.id ?? field?.id ?? ownId,
      'aria-describedby': describedBy,
      'aria-invalid': invalid || undefined,
      required: props.required ?? (field?.required || undefined),
      disabled: props.disabled ?? (field?.disabled || undefined),
    },
    invalid,
    labelId: field?.labelId,
  };
}

/** Shared look of text-like controls with SMRU chamfer corners */
export const controlClass =
  'block w-full rounded-control border border-line-strong bg-surface text-base text-ink shadow-xs sm:text-sm ' +
  'placeholder:text-ink-faint transition-[border-color,box-shadow] hover:border-navy-300 ' +
  'focus:border-navy-500 focus:outline-none focus:ring-3 focus:ring-navy-500/20 ' +
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-ink-faint ' +
  'aria-invalid:border-danger-600 aria-invalid:focus:ring-danger-600/15';

export interface FieldProps {
  label?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  labelHidden?: boolean;
  id?: string;
  className?: string;
}

/** Labelled form field with hint, error and required marker. */
export function Field({ label, children, hint, error, required = false, optional = false, disabled = false, labelHidden, id, className }: FieldProps) {
  const auto = useId();
  const controlId = id ?? `field-${auto}`;
  const labelId = `${controlId}-label`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const value: FieldContextValue = {
    id: controlId,
    labelId,
    describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
    invalid: !!error,
    required,
    disabled,
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <label id={labelId} htmlFor={controlId} className={cn('text-xs font-semibold text-ink sm:text-sm', labelHidden && 'sr-only')}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
          {optional && !required && <span className="ml-1 font-normal text-ink-faint">(optional)</span>}
        </label>
      )}
      <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
      {hint && (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-xs font-medium text-danger-600">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
export default Field;
