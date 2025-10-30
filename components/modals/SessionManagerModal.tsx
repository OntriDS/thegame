'use client';

import { useEffect, useState } from 'react';
import { getSessions, createSession, setActiveSession, clearActiveSession } from '@/lib/client/sessions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

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

  const recent = data.recentSessionIds || [];
  const short = (id?: string) => (id ? `${id.substring(0, 8)}...` : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Session Manager</DialogTitle>
          <DialogDescription>
            Manage your Groq AI conversation sessions
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Active Session</div>
            <div className="text-sm">
              {data.activeSessionId ? (
                <code className="bg-muted px-2 py-1 rounded text-xs">{short(data.activeSessionId)}</code>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
            {data.activeStats && (
              <div className="text-xs text-muted-foreground">
                Messages: {data.activeStats.messageCount} • Last Accessed: {new Date(data.activeStats.lastAccessedAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" disabled={loading} onClick={async () => { await createSession(); await load(); }}>
              New Session
            </Button>
            <Button size="sm" variant="outline" disabled={loading} onClick={async () => { await clearActiveSession(); await load(); }}>
              Clear Active
            </Button>
            <Button size="sm" variant="outline" disabled={loading} onClick={load}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Sessions</div>
            <div className="border rounded-md divide-y max-h-60 overflow-auto">
              {recent.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">No recent sessions</div>
              )}
              {recent.map(id => (
                <div key={id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{short(id)}</code>
                  <Button size="sm" variant="outline" onClick={async () => { await setActiveSession(id); await load(); }}>
                    Set Active
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



