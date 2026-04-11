'use client';

import type { SalesModalDirectContentCommonProps } from './sales-modal-direct-content';

export interface SalesModalOnlineContentProps extends SalesModalDirectContentCommonProps {}

export default function SalesModalOnlineContent(_props: SalesModalOnlineContentProps) {
  void _props;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border/80">
      <div className="min-h-0 flex-1 px-6 py-8 text-sm text-muted-foreground">
        Online sale content is not configured yet. Use Direct Sales until this mode is implemented.
      </div>
    </div>
  );
}
