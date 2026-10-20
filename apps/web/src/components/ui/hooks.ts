import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { getTabbables } from './utils';

/** Breakpoints matching Tailwind's defaults (min-width). */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/**
 * Live `window.matchMedia(query).matches`. Returns `fallback` where matchMedia is missing
 * (server, tests), so components render a sensible default layout there.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback;
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

export interface Disclosure {
  open: boolean;
  onOpen(): void;
  onClose(): void;
  onToggle(): void;
  setOpen(open: boolean): void;
}

/** Open/close state for modals, drawers and popovers. */
export function useDisclosure(initial = false): Disclosure {
  const [open, setOpen] = useState(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((o) => !o), []);
  return { open, onOpen, onClose, onToggle, setOpen };
}

/** A ref that always holds the latest value (for callbacks used inside long-lived listeners). */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Controlled when `value` is given, otherwise internal state seeded from `defaultValue`. */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set];
}

// --- Overlay stacks ---
let nextLayerId = 1;
const escapeStack: number[] = [];
const trapStack: number[] = [];

function remove(stack: number[], id: number) {
  const i = stack.lastIndexOf(id);
  if (i >= 0) stack.splice(i, 1);
}

/** Calls `onEscape` when Escape is pressed while this is the top-most open overlay. */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  const latest = useLatest(onEscape);
  useEffect(() => {
    if (!active) return;
    const id = nextLayerId++;
    escapeStack.push(id);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || escapeStack[escapeStack.length - 1] !== id) return;
      e.preventDefault();
      latest.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      remove(escapeStack, id);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, latest]);
}

export interface FocusTrapOptions {
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocus?: boolean;
}

/**
 * Keeps keyboard focus inside `containerRef` while `active`.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { initialFocusRef, returnFocus = true }: FocusTrapOptions = {},
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;
    const id = nextLayerId++;
    trapStack.push(id);
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const initial =
      initialFocusRef?.current ??
      container.querySelector<HTMLElement>('[data-autofocus]') ??
      getTabbables(container)[0] ??
      container;
    initial.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || trapStack[trapStack.length - 1] !== id) return;
      const items = getTabbables(container);
      if (!items.length) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;
      const outside = !container.contains(current);
      if (e.shiftKey && (current === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      remove(trapStack, id);
      document.removeEventListener('keydown', onKeyDown);
      if (returnFocus && previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [active]);
}

let scrollLocks = 0;
let savedOverflow = '';

/** Stops the page behind an open modal/drawer from scrolling (reference counted). */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (scrollLocks++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

/** Calls `onOutside` for pointer presses outside every given element while `active`. */
export function useOutsidePress(
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  active: boolean,
  onOutside: () => void,
): void {
  const latest = useLatest(onOutside);
  const refsLatest = useLatest(refs);
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (refsLatest.current.some((r) => r.current?.contains(target))) return;
      latest.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [active, latest, refsLatest]);
}
