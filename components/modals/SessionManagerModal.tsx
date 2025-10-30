'use client';

import { useEffect, useState } from 'react';
import { getSessions, createSession, setActiveSession, clearActiveSession } from '@/lib/client/sessions';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SessionManagerModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ activeSessionId?: string; activeStats?: any; recentSessionIds?: string[] }>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSessions();
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  if (!open) return null;

  const recent = data.recentSessionIds || [];
  const short = (id?: string) => (id ? `${id.substring(0, 8)}...` : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-md shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Session Manager</h3>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}

        <div className="text-sm mb-3">
          <div className="mb-1">Active Session: {data.activeSessionId ? <code>{short(data.activeSessionId)}</code> : 'None'}</div>
          {data.activeStats && (
            <div className="text-xs text-muted-foreground">Messages: {data.activeStats.messageCount} • Last Accessed: {new Date(data.activeStats.lastAccessedAt).toLocaleString()}</div>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <Button size="sm" disabled={loading} onClick={async () => { await createSession(); await load(); }}>New Session</Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={async () => { await clearActiveSession(); await load(); }}>Clear Active</Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={load}>Refresh</Button>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">Recent Sessions</div>
          <div className="border rounded-md divide-y max-h-60 overflow-auto">
            {recent.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No recent sessions</div>
            )}
            {recent.map(id => (
              <div key={id} className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="text-xs">{id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={async () => { await setActiveSession(id); await load(); }}>Set Active</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



