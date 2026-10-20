import React, { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from './hooks';
import { cn } from './utils';

const MODAL_SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
} as const;

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof MODAL_SIZES;
  maxWidth?: keyof typeof MODAL_SIZES;
  showCloseButton?: boolean;
  hideClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  role?: 'dialog' | 'alertdialog';
  className?: string;
}

export function Modal({
  isOpen,
  open: openProp,
  onClose,
  title,
  description,
  children,
  footer,
  size,
  maxWidth,
  showCloseButton = true,
  hideClose,
  initialFocusRef,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  role = 'dialog',
  className,
}: ModalProps) {
  const visible = openProp !== undefined ? openProp : !!isOpen;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEscapeKey(visible && closeOnEscape, onClose);
  useFocusTrap(panelRef, visible, { initialFocusRef });
  useBodyScrollLock(visible);

  if (!visible) return null;

  const resolvedSize = size ?? maxWidth ?? 'md';
  const shouldHideClose = hideClose ?? !showCloseButton;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        data-overlay
        aria-hidden
        className="fixed inset-0 animate-fade-in bg-scrim"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Modal Dialog with SMRU signature chamfer corners */}
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-card bg-surface shadow-pop outline-none sm:rounded-card z-10',
          'animate-sheet-up sm:animate-pop-in',
          MODAL_SIZES[resolvedSize] || 'sm:max-w-lg',
          className
        )}
      >
        {(title || !shouldHideClose) && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 id={titleId} className="text-base sm:text-lg leading-snug font-bold text-ink">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descriptionId} className="mt-0.5 text-xs sm:text-sm text-ink-soft">
                  {description}
                </p>
              )}
            </div>
            {!shouldHideClose && (
              <IconButton aria-label="Close" icon={X} onClick={onClose} size="sm" className="-mr-1 text-ink-faint hover:text-ink" />
            )}
          </div>
        )}

        {children !== undefined && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>}

        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3 *:w-full sm:*:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const DRAWER_SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
} as const;

export interface DrawerProps {
  open: boolean;
  onClose(): void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left' | 'bottom';
  size?: keyof typeof DRAWER_SIZES;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  hideClose?: boolean;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  initialFocusRef,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  hideClose,
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEscapeKey(open && closeOnEscape, onClose);
  useFocusTrap(panelRef, open, { initialFocusRef });
  useBodyScrollLock(open);

  if (!open) return null;

  const placement = {
    right: cn('inset-y-0 right-0 w-full animate-slide-in-right safe-top', DRAWER_SIZES[size]),
    left: cn('inset-y-0 left-0 w-[min(22rem,88vw)] animate-slide-in-left safe-top', size !== 'md' && DRAWER_SIZES[size]),
    bottom: 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-card animate-sheet-up',
  }[side];

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div data-overlay aria-hidden className="fixed inset-0 animate-fade-in bg-scrim" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn('fixed flex flex-col bg-surface shadow-pop outline-none z-10', placement, className)}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base sm:text-lg leading-snug font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-xs sm:text-sm text-ink-soft">
                {description}
              </p>
            )}
          </div>
          {!hideClose && <IconButton aria-label="Close" icon={X} onClick={onClose} size="sm" className="-mr-1 text-ink-faint hover:text-ink" />}
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 pt-4', footer ? 'pb-4' : 'pb-[max(1rem,env(safe-area-inset-bottom))]')}>
          {children}
        </div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
