import React from 'react';

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </span>
        </label>
      )}

      {children}

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
};
