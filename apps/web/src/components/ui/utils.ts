import { clsx, type ClassValue } from 'clsx';

/** Join class names; falsy values are dropped (thin wrapper over clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

const TABBABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Elements inside `root` that Tab can reach, in DOM order. */
export function getTabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[hidden],[inert]') && el.getAttribute('aria-hidden') !== 'true',
  );
}

/** Human file size: "820 KB", "4.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

const HONORIFICS = new Set(['dr', 'prof', 'mr', 'mrs', 'ms', 'shri', 'smt', 'sri', 'fr', 'sr', 'rev']);

/** Up to two initials from a person's name, skipping honorifics ("Dr. Asha Rao" → "AR"). */
export function initials(name: string): string {
  if (!name) return 'U';
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  const meaningful = words.filter((w) => !HONORIFICS.has(w.toLowerCase()));
  const use = meaningful.length ? meaningful : words;
  if (!use.length) return '?';
  const first = use[0]!.charAt(0);
  const last = use.length > 1 ? use[use.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}
