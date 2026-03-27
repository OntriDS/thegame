import { Suspense } from 'react';
import ControlRoom from '@/components/control-room/control-room';

export default function ControlRoomPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading control room…</div>}>
      <ControlRoom />
    </Suspense>
  );
}
