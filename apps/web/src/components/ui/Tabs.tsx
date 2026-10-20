import React, { createContext, useContext, useId, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useControllableState } from './hooks';
import { cn } from './utils';

export interface TabItem<V extends string = string> {
  id?: V;
  value?: V;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsContextValue {
  baseId: string;
  value: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

const tabId = (base: string, value: string) => `${base}-tab-${value}`;
const panelId = (base: string, value: string) => `${base}-panel-${value}`;

export interface TabsProps<V extends string = string> {
  tabs?: readonly TabItem<V>[];
  items?: readonly TabItem<V>[];
  activeTab?: V;
  value?: V;
  defaultValue?: V;
  onChange?: (tabId: V) => void;
  onValueChange?: (value: V) => void;
  'aria-label'?: string;
  variant?: 'underline' | 'pills';
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  listClassName?: string;
}

export function Tabs<V extends string = string>({
  tabs,
  items,
  activeTab,
  value: valueProp,
  defaultValue,
  onChange,
  onValueChange,
  variant = 'pills',
  fullWidth = false,
  children,
  className,
  listClassName,
  ...rest
}: TabsProps<V>) {
  const tabList = (items || tabs || []) as TabItem<V>[];
  const controlledValue = valueProp !== undefined ? valueProp : activeTab;
  const changeHandler = onValueChange || onChange;

  const baseId = useId();
  const firstEnabled = (tabList.find((i) => !i.disabled)?.value ??
    tabList.find((i) => !i.disabled)?.id ??
    tabList[0]?.value ??
    tabList[0]?.id) as V | undefined;

  const [selected, setSelected] = useControllableState<V | undefined>(
    controlledValue,
    defaultValue ?? firstEnabled,
    changeHandler as ((v: V | undefined) => void) | undefined
  );

  const select = (v: V, focus: boolean) => {
    setSelected(v);
    if (focus) document.getElementById(tabId(baseId, v))?.focus();
  };

  const getKeyValue = (item: TabItem<V>): V => {
    return (item.value || item.id || '') as V;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = tabList.filter((i) => !i.disabled);
    const index = enabled.findIndex((i) => getKeyValue(i) === selected);
    let next: TabItem<V> | undefined;
    if (e.key === 'ArrowRight') next = enabled[(index + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    select(getKeyValue(next), true);
  };

  const renderIcon = (icon: ReactNode) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as unknown as LucideIcon;
    if (typeof IconComp === 'function' || typeof IconComp === 'object') {
      return <IconComp aria-hidden className="size-4 shrink-0" />;
    }
    return null;
  };

  return (
    <TabsContext.Provider value={{ baseId, value: String(selected ?? '') }}>
      <div className={className}>
        <div
          role="tablist"
          aria-label={rest['aria-label'] || 'Navigation Tabs'}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className={cn(
            'scrollbar-none flex overflow-x-auto',
            variant === 'underline' ? 'gap-1 border-b border-line' : 'gap-1 rounded-control bg-canvas p-1 border border-line-strong/40',
            listClassName
          )}
        >
          {tabList.map((item) => {
            const key = getKeyValue(item);
            const active = key === selected;
            return (
              <button
                key={key}
                id={tabId(baseId, key)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={active ? panelId(baseId, key) : undefined}
                tabIndex={active ? 0 : -1}
                disabled={item.disabled}
                onClick={() => select(key, false)}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-2 px-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                  fullWidth && 'flex-1',
                  variant === 'underline'
                    ? cn(
                        '-mb-px min-h-10 sm:min-h-11 border-b-2',
                        active
                          ? 'border-gold-400 text-navy-950 font-bold'
                          : 'border-transparent text-ink-soft hover:border-line-strong hover:text-ink'
                      )
                    : cn(
                        'min-h-8 sm:min-h-9 rounded-[6px]',
                        active
                          ? 'bg-surface text-navy-800 font-bold shadow-xs ring-1 ring-gold-400/50'
                          : 'text-ink-soft hover:text-ink'
                      )
                )}
              >
                {renderIcon(item.icon)}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      'min-w-5 rounded-full px-1.5 py-px text-center text-[10px] sm:text-xs font-semibold tabular-nums',
                      active
                        ? 'bg-gold-400 text-navy-950 font-bold'
                        : 'bg-line text-ink-soft'
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  keepMounted?: boolean;
  className?: string;
}

export function TabPanel({ value, children, keepMounted = false, className }: TabPanelProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabPanel must be inside <Tabs>');
  const active = ctx.value === value;
  if (!active && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(ctx.baseId, value)}
      aria-labelledby={tabId(ctx.baseId, value)}
      hidden={!active}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500', className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
