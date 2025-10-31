'use client';

import { useEffect, useState } from 'react';
import { getSessions, createSession, setActiveSession } from '@/lib/client/sessions';
import { ClientAPI } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import type { AISession } from '@/types/entities';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionLoad?: (sessionId: string) => Promise<void>;
}

export default function SessionManagerModal({ open, onOpenChange, onSessionLoad }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ activeSessionId?: string; activeStats?: any; sessions?: AISession[] }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const sessions = data.sessions || [];
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await setActiveSession(sessionId);
      if (onSessionLoad) {
        await onSessionLoad(sessionId);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleNewSession = async () => {
    try {
      await createSession();
      await load();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      await ClientAPI.updateSessionName(id, name);
      setEditingId(null);
      setEditName('');
      await load();
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await ClientAPI.deleteSession(id);
      await load();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-2xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Session Manager</DialogTitle>
          <DialogDescription>
            Manage your AI conversation sessions
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">All Sessions</div>
            <Button size="sm" disabled={loading} onClick={handleNewSession} className="gap-2">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </div>

          <div className="border border-border rounded-md divide-y max-h-96 overflow-auto bg-background">
            {loading && sessions.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground text-center">Loading sessions...</div>
            )}
            
            {!loading && sessions.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground text-center">No sessions yet. Create one to get started.</div>
            )}

            {sessions.map(session => (
              <div
                key={session.id}
                className={`p-3 flex items-center justify-between hover:bg-muted/50 transition-colors ${data.activeSessionId === session.id ? 'bg-accent/40 dark:bg-accent/20 border-l-4 border-accent' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm bg-background"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (editName.trim()) {
                          void handleRename(session.id, editName.trim());
                        } else {
                          setEditingId(null);
                          setEditName('');
                        }
                      }}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingId(null);
                        setEditName('');
                      }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {session.name}
                        {data.activeSessionId === session.id && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">Active</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span>{session.messageCount} messages</span>
                        <span>•</span>
                        <span>{formatDate(session.lastAccessedAt)}</span>
                        <span>•</span>
                        <span>{session.model}</span>
                      </div>
                    </>
                  )}
                </div>
                
                {editingId !== session.id && (
                  <div className="flex gap-1 ml-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        await handleLoadSession(session.id);
                      }}
                    >
                      Load
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setEditingId(session.id);
                        setEditName(session.name);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDelete(session.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
