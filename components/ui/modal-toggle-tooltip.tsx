'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/theme-utils';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

/** Shared helper text for Customer / Beneficiary (or counterparty role) toggles in modals */
export const MODAL_TOGGLE_TOOLTIP_COPY = {
  counterpartyRole:
    'Customer = money charged to them. Beneficiary = money paid to them.',
  newExistingCustomer:
    'New: create a new customer. Existing: choose from existing customers.',
  newExistingCounterparty:
    'New: create a new counterparty. Existing: choose from existing characters.',
  newExistingItem: 'New: create a new item. Existing: choose from existing items.',
} as const;

export type ModalToggleTooltipProps = {
  children: React.ReactElement;
  /** String or node; strings get a simple paragraph for consistent spacing */
  content: React.ReactNode;
  delayDuration?: number;
  side?: 'top' | 'bottom';
  className?: string;
  /**
   * When true, skips the hover panel (unreliable over disabled controls) and sets native `title` if content is a string.
   */
  disabled?: boolean;
};

/**
 * Tooltip for small modal toggles (Customer/Beneficiary, New/Existing, item New/Existing).
 * Renders in-flow (no portal) so it stays aligned inside Radix Dialog; styling matches `TooltipContent`.
 */
export function ModalToggleTooltip({
  children,
  content,
  delayDuration = 1000,
  side = 'top',
  className,
  disabled = false,
}: ModalToggleTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = React.useId();

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleShow = () => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const hide = () => {
    clearTimer();
    setOpen(false);
  };

  if (disabled) {
    const existing = (children.props as { title?: string }).title;
    return React.cloneElement(children, {
      title: typeof content === 'string' ? content : existing,
    } as React.HTMLAttributes<HTMLElement>);
  }

  const trigger = React.cloneElement(children, {
    'aria-describedby': open ? id : undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={scheduleShow}
      onMouseLeave={hide}
      onFocusCapture={scheduleShow}
      onBlurCapture={hide}
    >
      {trigger}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            getZIndexClass('TOOLTIPS'),
            'pointer-events-none absolute max-w-[min(18rem,calc(100vw-2rem))] whitespace-normal rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
            side === 'top'
              ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
              : 'top-full left-1/2 mt-1.5 -translate-x-1/2'
          )}
        >
          {typeof content === 'string' ? (
            <span className="block">{content}</span>
          ) : (
            content
          )}
        </span>
      ) : null}
    </span>
  );
}
