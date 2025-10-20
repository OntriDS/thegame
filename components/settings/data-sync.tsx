'use client';

import { useState } from 'react';
import { SettingsPanel } from '@/components/settings/settings-panel';

export default function DataSync() {
  const [status, setStatus] = useState<string>('');

  return (
    <div className="space-y-4">
      <SettingsPanel onStatusUpdate={setStatus} />
    </div>
  );
}