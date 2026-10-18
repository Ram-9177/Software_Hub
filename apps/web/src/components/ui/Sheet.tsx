import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: 'bottom' | 'right';
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  side = 'bottom',
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {side === 'bottom' ? (
        <div
          role="dialog"
          aria-modal="true"
          className={`relative mt-auto w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 transition-transform duration-200 animate-in slide-in-from-bottom pb-safe ${className}`}
        >
          {/* Pull handle indicator */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 shrink-0" />

          {/* Header */}
          {(title || description) && (
            <div className="flex items-center justify-between px-6 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                {title && (
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                )}
                {description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="overflow-y-auto p-6 flex-1 min-h-0">{children}</div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          className={`relative ml-auto h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 transition-transform duration-200 animate-in slide-in-from-right ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              {title && (
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 flex-1 min-h-0">{children}</div>
        </div>
      )}
    </div>
  );
};
