'use client';

import { useEffect, useState, useRef } from 'react';
import { getSessions, createSession, setActiveSession } from '@/lib/client/sessions';
import { ClientAPI } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Trash2, Edit2, Check, X, Plus, Bot, Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AISession } from '@/types/entities';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionLoad?: (sessionId: string) => Promise<void>;
}

export default function AiSessionManagerSubmodal({ open, onOpenChange, onSessionLoad }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ activeSessionId?: string; activeStats?: any; sessions?: AISession[] }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Curated model list with tiers (same as AI Assistant Tab)
  const availableModels = [
    // TIER 1: Reasoners
    { id: 'openai/gpt-oss-120b', displayName: 'gpt-oss-120b (Top reasoning)', category: 'Reasoners' },
    { id: 'llama-3.3-70b-versatile', displayName: 'llama-3.3-70b (Versatile)', category: 'Reasoners' },

    // TIER 2: Specialists
    { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'moonshotai-kimi-1000B-32b (Analysis, Large)', category: 'Specialists' },
    { id: 'qwen/qwen3-32b', displayName: 'qwen3-32b (Balance)', category: 'Specialists' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', displayName: 'llama-4-128e-17b (Creative, Large)', category: 'Specialists' },

    // TIER 3: Speed
    { id: 'openai/gpt-oss-20b', displayName: 'gpt-oss-20b (Performance)', category: 'Speed' },
    { id: 'groq/compound', displayName: 'groq/compound (Fast)', category: 'Speed' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', displayName: 'llama-4-scout-16e-17b (Info gathering)', category: 'Speed' }
  ];

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
    if (open) {
      void load();
    }
  }, [open]);

  const sessions = data.sessions || [];

  // Helper function to get display name for a model
  const getModelDisplayName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? model.displayName : modelId.replace('openai/', '').replace('llama-', 'Llama ');
  };

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
      await createSession(selectedModel);
      setShowNewSessionForm(false);
      setSelectedModel('openai/gpt-oss-120b'); // Reset to default
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

  const handleExportSession = async (sessionId: string) => {
    try {
      const sessionData = await ClientAPI.exportSession(sessionId);
      const blob = new Blob([sessionData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-session-${sessionId.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
      alert('Failed to export session');
    }
  };

  const handleImportSession = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await ClientAPI.importSession(text);
      await load();
      alert('Session imported successfully!');
    } catch (error) {
      console.error('Failed to import session:', error);
      alert('Failed to import session: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="w-full max-w-2xl max-h-[80vh] bg-background text-foreground flex flex-col">
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

        <div className="space-y-4 flex-1 min-h-0">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">All Sessions ({sessions.length}/20)</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                title="Import Session"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              {!showNewSessionForm ? (
                <Button size="sm" disabled={loading} onClick={() => setShowNewSessionForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Session
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select AI Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Group models by category */}
                      <div className="p-2">
                        {['Reasoners', 'Specialists', 'Speed'].map(category => {
                          const categoryModels = availableModels.filter(model => model.category === category);
                          return (
                            <div key={category} className="mb-4 last:mb-0">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                                {category}
                              </div>
                              <div className="space-y-1">
                                {categoryModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id} className="pl-4">
                                    {model.displayName}
                                  </SelectItem>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleNewSession} className="gap-2">
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowNewSessionForm(false);
                    setSelectedModel('openai/gpt-oss-120b');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="border border-border rounded-md divide-y flex-1 overflow-auto bg-background min-h-0">
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm bg-background"
                          autoFocus
                        />
                        <Select value={session.model} onValueChange={async (m) => {
                          try {
                            await ClientAPI.updateSessionModel(session.id, m);
                            await load();
                          } catch (e) {
                            console.error('Failed to update model', e);
                          }
                        }}>
                          <SelectTrigger className="h-8 w-[240px]">
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Group models by category */}
                            <div className="p-2">
                              {['Reasoners', 'Specialists', 'Speed'].map(category => {
                                const categoryModels = availableModels.filter(model => model.category === category);
                                return (
                                  <div key={category} className="mb-4 last:mb-0">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                                      {category}
                                    </div>
                                    <div className="space-y-1">
                                      {categoryModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id} className="pl-4">
                                          {model.displayName}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
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
                    </div>
                  ) : (
                    <div className="flex-1">
                      {/* Session info and metadata on top */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium truncate">
                          {session.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">
                            {session.messageCount} messages • {formatDate(session.lastAccessedAt)}
                          </div>
                          {data.activeSessionId === session.id && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </div>

                      {/* Model info */}
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {getModelDisplayName(session.model || 'Unknown')}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
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
                          onClick={() => handleExportSession(session.id)}
                          title="Export Session"
                        >
                          <Download className="h-4 w-4" />
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
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden file input for importing sessions */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportSession}
        />
      </DialogContent>
    </Dialog>
  );
}

