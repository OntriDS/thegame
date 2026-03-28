'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, DollarSign, Package, User } from 'lucide-react';

export function AdminSettingsTab() {
  const [migrationOutput, setMigrationOutput] = useState<string>('');
  const [migrationBusy, setMigrationBusy] = useState(false);

  const runMigrationPreview = async () => {
    setMigrationBusy(true);
    setMigrationOutput('');
    try {
      const res = await fetch('/api/settings?preview=migrate-financial-suite');
      const data = await res.json();
      setMigrationOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setMigrationOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrationBusy(false);
    }
  };

  const runMigrationApply = async () => {
    if (
      !window.confirm(
        'Apply financial migration suite to KV? This writes entity rows and log lists. Run Preview first if unsure.'
      )
    ) {
      return;
    }
    setMigrationBusy(true);
    setMigrationOutput('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate-financial-suite',
          parameters: { dryRun: false },
        }),
      });
      const data = await res.json();
      setMigrationOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setMigrationOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrationBusy(false);
    }
  };

  return (
    <TabsContent value="admin" className="space-y-4">
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="financials" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="inventories" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventories
          </TabsTrigger>
          <TabsTrigger value="player" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Characters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Management Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Task management settings will be configured here</p>
                <p className="text-sm">Automation rules, templates, and workflow preferences</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>
                Temporary one-off migration (remove after manual migration). Preview = dry run; Apply writes KV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={migrationBusy}
                  onClick={runMigrationPreview}
                >
                  Preview migration (dry run)
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={migrationBusy}
                  onClick={runMigrationApply}
                >
                  Apply migration
                </Button>
              </div>
              {migrationOutput ? (
                <pre className="text-xs bg-muted/50 border rounded-md p-3 max-h-72 overflow-auto whitespace-pre-wrap break-all">
                  {migrationOutput}
                </pre>
              ) : null}
              <div className="text-center py-6 text-muted-foreground border-t border-dashed pt-6">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Other financial preferences can live here later</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Inventory management settings will be configured here</p>
                <p className="text-sm">Stock management, alerts, and automation preferences</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="player" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Character Management Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Character management settings will be configured here</p>
                <p className="text-sm">Character profiles, roles, permissions, and activity tracking</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
