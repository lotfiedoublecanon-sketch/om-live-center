import { createContext, useContext, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextValue { value: string; onValueChange: (value: string) => void }
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ value, onValueChange, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { value: string; onValueChange: (value: string) => void; children: ReactNode }) {
  return <TabsContext.Provider value={{ value, onValueChange }}><div className={className} {...props}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ className, onKeyDown, ...props }: HTMLAttributes<HTMLDivElement>) {
  const keyboardNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
    buttons[next]?.click();
  };
  return <div role="tablist" className={cn('tabs-list', className)} onKeyDown={keyboardNavigation} {...props} />;
}

export function TabsTrigger({ value, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & { value: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger doit être utilisé dans Tabs');
  const active = context.value === value;
  return <button type="button" role="tab" id={`om-tab-${value}`} aria-controls={`om-panel-${value}`} aria-selected={active} data-state={active ? 'active' : 'inactive'} tabIndex={active ? 0 : -1} className={cn('tabs-trigger', className)} onClick={() => context.onValueChange(value)} {...props} />;
}

export function TabsContent({ value, forceMount = false, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { value: string; forceMount?: boolean }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent doit être utilisé dans Tabs');
  const active = context.value === value;
  if (!forceMount && !active) return null;
  return <div role="tabpanel" id={`om-panel-${value}`} aria-labelledby={`om-tab-${value}`} hidden={!active} data-state={active ? 'active' : 'inactive'} className={cn('tabs-content', className)} {...props}>{children}</div>;
}
