'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Boxes, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type LlmToolSchema = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type CatalogAgent = {
  id: string;
  name: string;
  codeName?: string;
  tools: LlmToolSchema[];
};

type CatalogPayload = {
  sharedTools: LlmToolSchema[];
  agents: CatalogAgent[];
};

type NavKey = 'shared' | string;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ToolboxSubmodal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [selectedKey, setSelectedKey] = useState<NavKey>('shared');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/pixelbrain/agent-tools', { cache: 'no-store' });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as CatalogPayload;
      if (!json || !Array.isArray(json.sharedTools) || !Array.isArray(json.agents)) {
        throw new Error('Invalid catalog shape');
      }
      setData(json);
      setSelectedKey('shared');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tools');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open]);

  const selectedTools: LlmToolSchema[] = (() => {
    if (!data) return [];
    if (selectedKey === 'shared') return data.sharedTools;
    const agent = data.agents.find((a) => a.id === selectedKey);
    return agent?.tools ?? [];
  })();

  const selectedTitle =
    selectedKey === 'shared'
      ? 'Shared / Core (TheGame reads)'
      : data?.agents.find((a) => a.id === selectedKey)?.name || selectedKey;

  const selectedSubtitle =
    selectedKey !== 'shared'
      ? data?.agents.find((a) => a.id === selectedKey)?.codeName
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Tool box
          </DialogTitle>
          <DialogDescription>
            LLM tool schemas from Pixelbrain (shared tools listed once; specialists show exclusive tools only).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 border-t">
          <div className="w-[220px] shrink-0 border-r bg-muted/30 flex flex-col">
            <div className="p-2 border-b flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => void load()}
                disabled={loading}
                title="Refresh"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedKey('shared')}
                  className={cn(
                    'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
                    selectedKey === 'shared'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  Shared tools
                </button>
                {data?.agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedKey(a.id)}
                    className={cn(
                      'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
                      selectedKey === a.id
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="truncate">{a.name}</div>
                    {a.codeName && (
                      <div className="truncate text-xs opacity-80">{a.codeName}</div>
                    )}
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-4 border-b shrink-0 bg-muted/10">
              <h3 className="font-bold text-lg">{selectedTitle}</h3>
              {selectedSubtitle && (
                <p className="text-sm text-muted-foreground">{selectedSubtitle}</p>
              )}
            </div>
            <ScrollArea className="flex-1 h-[min(60vh,520px)]">
              <div className="p-4 space-y-4">
                {loading && !data && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading catalog…
                  </div>
                )}
                {error && (
                  <div className="text-sm text-destructive space-y-2">
                    <p>{error}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                      Retry
                    </Button>
                  </div>
                )}
                {!loading && !error && selectedTools.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tools in this section.</p>
                )}
                {selectedTools.map((tool, idx) => (
                  <article
                    key={`${tool.function.name}-${idx}`}
                    className="rounded-lg border bg-card p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-mono text-2xl font-bold text-center tracking-tight text-primary">
                      {tool.function.name}
                    </h4>
                    <p className="text-md text-muted-foreground leading-relaxed whitespace-pre-wrap text-center max-w-2xl mx-auto">
                      {tool.function.description}
                    </p>
                    <details className="text-xs group">
                      <summary className="cursor-pointer text-primary font-medium py-1 list-none flex items-center gap-1">
                        <span className="select-none">Developer details</span>
                        <span className="text-muted-foreground group-open:rotate-90 transition-transform">▸</span>
                      </summary>
                      <pre className="mt-2 p-3 rounded-md bg-muted overflow-x-auto text-[11px] leading-snug border">
                        {JSON.stringify(tool.function.parameters, null, 2)}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
