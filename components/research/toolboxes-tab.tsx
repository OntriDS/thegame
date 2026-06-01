import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Wrench, Box, Tag, Shield, Server, FileCode2 } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  systemId: string;
  parameters: any;
  tags?: string[];
  roles?: string[];
  implementation?: string;
}

interface Toolbox {
  systemId: string;
  tools: Tool[];
}

export function ToolboxesTab() {
  const [toolboxes, setToolboxes] = useState<Toolbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  const fetchToolboxes = async () => {
    try {
      const res = await fetch('/api/toolboxes');
      if (res.ok) {
        const data = await res.json();
        setToolboxes(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch toolboxes', e);
    } finally {
      setLoading(false);
    }
  };

  const syncToolboxes = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/toolboxes', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setToolboxes(data.data || []);
      }
    } catch (e) {
      console.error('Failed to sync toolboxes', e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchToolboxes();
  }, []);

  const getSystemColor = (systemId: string) => {
    switch (systemId) {
      case 'thegame': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'akiles-ecosystem': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pixelbrain': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSystemIcon = (systemId: string) => {
    switch (systemId) {
      case 'thegame': return <Server className="h-5 w-5 mr-2" />;
      case 'akiles-ecosystem': return <Box className="h-5 w-5 mr-2" />;
      case 'pixelbrain': return <FileCode2 className="h-5 w-5 mr-2" />;
      default: return <Wrench className="h-5 w-5 mr-2" />;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading toolboxes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Distributed Toolboxes</h2>
          <p className="text-muted-foreground">
            A unified view of all available tools across the digital universe swarm.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={syncToolboxes} 
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Network'}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)] pr-4">
        <div className="space-y-8 pb-8">
          {toolboxes.map((toolbox) => (
            <div key={toolbox.systemId} className="space-y-4">
              <div className={`flex items-center px-4 py-2 rounded-md border ${getSystemColor(toolbox.systemId)}`}>
                {getSystemIcon(toolbox.systemId)}
                <h3 className="text-lg font-semibold uppercase tracking-wider">
                  {toolbox.systemId}
                </h3>
                <Badge variant="secondary" className="ml-4 bg-white/50">
                  {toolbox.tools.length} Tools
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 pl-4 border-l-2 border-muted ml-4">
                {toolbox.tools.map((tool) => {
                  const isExpanded = expandedToolId === tool.id;
                  return (
                    <Card key={tool.id} className={`transition-all duration-200 ${isExpanded ? 'border-primary shadow-sm' : 'hover:border-primary/50 cursor-pointer'}`}
                      onClick={() => !isExpanded && setExpandedToolId(tool.id)}>
                      <CardHeader className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base font-medium font-mono">{tool.name}</CardTitle>
                          </div>
                          {isExpanded && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setExpandedToolId(null); }}>
                              Close
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-4 border-t mt-2">
                          {/* Tags & Roles */}
                          <div className="flex flex-wrap gap-4 mt-4">
                            {tool.roles && tool.roles.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                  <Shield className="h-3 w-3" /> Roles
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {tool.roles.map(r => (
                                    <Badge key={r} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{r}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {tool.tags && tool.tags.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                  <Tag className="h-3 w-3" /> Tags
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {tool.tags.map(t => (
                                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Parameters Schema */}
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                              <FileCode2 className="h-3 w-3" /> Input Schema
                            </div>
                            <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono overflow-x-auto text-muted-foreground">
                              {JSON.stringify(tool.parameters, null, 2)}
                            </pre>
                          </div>
                          
                          {/* Implementation */}
                          {tool.implementation && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Implementation: </span>
                              <span className="font-mono">{tool.implementation}</span>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          {toolboxes.length === 0 && !loading && (
            <div className="text-center text-muted-foreground p-8 border rounded-lg bg-muted/20">
              No toolboxes found in the registry. Try clicking &quot;Sync from Network&quot;.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
