'use client';

import { useState, useEffect } from 'react';
import { Bot, CheckCircle2, Circle, GraduationCap, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function AgentsTab() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const result = await response.json();
      
      if (result.success) {
        setAgents(result.data);
      } else {
        setError(result.error || 'Failed to fetch agents');
      }
    } catch (err) {
      setError('Network error while fetching agents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSyncAgents = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch('/api/agents/sync', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        await fetchAgents();
      } else {
        setError(result.error || 'Failed to sync agents');
      }
    } catch (err) {
      setError('Network error while syncing agents');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-background/60 backdrop-blur p-4 rounded-lg border border-primary/20">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Swarm Agents ({agents.length})
          </h2>
          <p className="text-sm text-muted-foreground">Source of Truth: university-state.md</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSyncAgents} 
          disabled={isSyncing}
          className="border-primary/20 hover:bg-primary/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Agents'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg">
          {error}
        </div>
      )}

      {agents.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4 bg-background/30 rounded-lg border border-dashed border-primary/20">
          <Bot className="h-12 w-12 opacity-50" />
          <p>No agents found in TheGame Database. Click &quot;Sync Agents&quot; to populate from university-state.md.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="bg-background/60 backdrop-blur border-primary/20">
              <CardHeader className="pb-3 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{agent.name}</CardTitle>
                      <CardDescription className="font-mono text-xs text-primary/70">{agent.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Education State */}
                {agent.educationState && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <GraduationCap className="h-4 w-4" />
                      Education State
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {agent.educationState.lessonCreated ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                        <span className={agent.educationState.lessonCreated ? "text-foreground" : "text-muted-foreground"}>Lesson Created</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.educationState.educated ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                        <span className={agent.educationState.educated ? "text-foreground" : "text-muted-foreground"}>Educated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.educationState.consolidated ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                        <span className={agent.educationState.consolidated ? "text-foreground" : "text-muted-foreground"}>Consolidated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.educationState.pro ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                        <span className={agent.educationState.pro ? "text-foreground" : "text-muted-foreground"}>Pro</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Knowledge Fields */}
                {agent.knowledgeFields && agent.knowledgeFields.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Knowledge Fields</div>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.knowledgeFields.map((field: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-primary/5 text-[10px] font-mono border-primary/20">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
