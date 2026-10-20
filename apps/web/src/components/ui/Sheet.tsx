import React, { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from './hooks';
import { cn } from './utils';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
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
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEscapeKey(isOpen, onClose);
  useFocusTrap(panelRef, isOpen);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        data-overlay
        aria-hidden
        className="fixed inset-0 bg-scrim animate-fade-in"
        onClick={onClose}
      />

      {side === 'bottom' ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative mt-auto w-full max-h-[88dvh] rounded-t-card bg-surface border-t border-line shadow-pop flex flex-col z-10',
            'animate-sheet-up pb-safe outline-none',
            className
          )}
        >
          {/* Pull handle indicator */}
          <div className="w-12 h-1 bg-line-strong/60 rounded-full mx-auto my-3 shrink-0" />

          {/* Header */}
          {(title || description) && (
            <div className="flex items-center justify-between px-6 pb-3 border-b border-line">
              <div>
                {title && (
                  <h3 className="text-base font-bold text-ink">{title}</h3>
                )}
                {description && (
                  <p className="text-xs text-ink-soft mt-0.5">{description}</p>
                )}
              </div>
              <IconButton
                aria-label="Close sheet"
                icon={X}
                onClick={onClose}
                size="sm"
                className="-mr-2 text-ink-faint hover:text-ink"
              />
            </div>
          )}

          {/* Body */}
          <div className="overflow-y-auto p-6 flex-1 min-h-0">{children}</div>
        </div>
      ) : (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative ml-auto h-full w-full max-w-md bg-surface border-l border-line shadow-pop flex flex-col z-10',
            'animate-slide-in-right outline-none safe-top',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div>
              {title && (
                <h3 className="text-base font-bold text-ink">{title}</h3>
              )}
              {description && (
                <p className="text-xs text-ink-soft mt-0.5">{description}</p>
              )}
            </div>
            <IconButton
              aria-label="Close drawer"
              icon={X}
              onClick={onClose}
              size="sm"
              className="-mr-2 text-ink-faint hover:text-ink"
            />
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 flex-1 min-h-0">{children}</div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default Sheet;
