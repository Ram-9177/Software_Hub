import React, { useState } from 'react';
import { cn, initials } from './utils';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  decorative?: boolean;
  className?: string;
}

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
} as const;

const STATUS_SIZES = {
  xs: 'size-1.5',
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-3',
  xl: 'size-3.5',
} as const;

const STATUS_COLORS = {
  online: 'bg-accent-500',
  offline: 'bg-ink-faint',
  busy: 'bg-danger-600',
  away: 'bg-gold-500',
};

const PALETTE = [
  'bg-navy-100 text-navy-800',
  'bg-accent-100 text-accent-800',
  'bg-gold-100 text-gold-800',
  'bg-status-requested-bg text-status-requested',
  'bg-status-reschedule-bg text-status-reschedule',
  'bg-status-outcome-bg text-status-outcome',
] as const;

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  decorative = false,
  className,
}) => {
  const [failed, setFailed] = useState(false);
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': name };

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      <span
        {...a11y}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold shadow-xs',
          SIZES[size],
          paletteFor(name),
          className
        )}
      >
        {src && !failed ? (
          <img src={src} alt={name} className="size-full object-cover" onError={() => setFailed(true)} />
        ) : (
          initials(name)
        )}
      </span>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900',
            STATUS_SIZES[size],
            STATUS_COLORS[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
