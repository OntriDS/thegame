'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Palette, Bell, User, FileText, AlertTriangle } from 'lucide-react';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

type DedupeMigrationResponse = {
  ok?: boolean;
  mode?: string;
  hint?: string;
  dryRun?: boolean;
  totalRemoved?: number;
  monthsTouched?: number;
  steps?: Array<{
    entityType: string;
    monthKey: string;
    before: number;
    after: number;
    removed: number;
  }>;
  error?: string;
};

export function SystemSettingsTab() {
  const { getPreference, setPreference } = useUserPreferences();
  const [logManagementEnabled, setLogManagementEnabled] = useState(false);
  const [dedupeLoading, setDedupeLoading] = useState<'idle' | 'preview' | 'execute'>('idle');
  const [dedupeResult, setDedupeResult] = useState<DedupeMigrationResponse | null>(null);

  useEffect(() => {
    setLogManagementEnabled(getPreference('log-management-enabled', false));
  }, [getPreference]);

  const handleToggleLogManagement = async (checked: boolean) => {
    setLogManagementEnabled(checked);
    await setPreference('log-management-enabled', checked);
  };

  return (
    <TabsContent value="system" className="space-y-4">
      {/* Log Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Management
          </CardTitle>
          <CardDescription>
            Advanced log editing capabilities (Founder only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Log Editing</Label>
              <p className="text-sm text-muted-foreground">
                Allow modification of log entries in Data Center
              </p>
            </div>
            <Switch
              checked={logManagementEnabled}
              onCheckedChange={handleToggleLogManagement}
            />
          </div>

          {logManagementEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Log management is enabled. All changes are tracked in audit trail.
                Only accessible by characters with FOUNDER role.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Maintenance Card */}
      <Card className="border-red-200 dark:border-red-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            System Maintenance
          </CardTitle>
          <CardDescription>
            Tools to repair and synchronize system-critical data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/40">
            <div className="space-y-1">
              <p className="text-sm font-medium">Repair System Automations</p>
              <p className="text-xs text-muted-foreground">
                Synchronize and recreate the 5 system automation tasks in the Control Room.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              onClick={async () => {
                if (confirm("Are you sure you want to sync system automations? This will recreate or rename the legacy automation tasks.")) {
                  try {
                    const res = await import('@/lib/client-api').then(m => m.ClientAPI.repairAutomations());
                    alert(res.message);
                  } catch (e: any) {
                    alert("Repair failed: " + e.message);
                  }
                }
              }}
            >
              Sync Now
            </Button>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/40">
            <div className="space-y-1">
              <p className="text-sm font-medium">Deduplicate lifecycle log rows (duplicate IDs)</p>
              <p className="text-xs text-muted-foreground">
                Within each monthly Redis list, collapse multiple elements that share the same <code className="text-[10px]">id</code>.
                Keeps the newest timestamp (then richest edit history). Fixes legacy data from an old log-edit relocate bug.
                Preview does not write; apply rewrites affected lists.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={dedupeLoading !== 'idle'}
                className="border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white"
                onClick={async () => {
                  setDedupeLoading('preview');
                  setDedupeResult(null);
                  try {
                    const res = await fetch('/api/logs/dedupe-duplicate-ids', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    });
                    const data = (await res.json()) as DedupeMigrationResponse;
                    if (!res.ok) {
                      setDedupeResult({ error: data.error || res.statusText });
                    } else {
                      setDedupeResult(data);
                    }
                  } catch (e: any) {
                    setDedupeResult({ error: e?.message || 'Request failed' });
                  } finally {
                    setDedupeLoading('idle');
                  }
                }}
              >
                {dedupeLoading === 'preview' ? 'Previewing…' : 'Preview (dry run)'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={dedupeLoading !== 'idle'}
                onClick={async () => {
                  if (
                    !confirm(
                      'Apply deduplication to all entity log months? This rewrites Redis lists where duplicate ids were found. Run Preview first if unsure.'
                    )
                  ) {
                    return;
                  }
                  setDedupeLoading('execute');
                  setDedupeResult(null);
                  try {
                    const res = await fetch('/api/logs/dedupe-duplicate-ids', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm: true }),
                    });
                    const data = (await res.json()) as DedupeMigrationResponse;
                    if (!res.ok) {
                      setDedupeResult({ error: data.error || res.statusText });
                    } else {
                      setDedupeResult(data);
                    }
                  } catch (e: any) {
                    setDedupeResult({ error: e?.message || 'Request failed' });
                  } finally {
                    setDedupeLoading('idle');
                  }
                }}
              >
                {dedupeLoading === 'execute' ? 'Applying…' : 'Apply migration'}
              </Button>
            </div>
            {dedupeResult && (
              <div className="rounded-md border bg-background/80 text-xs font-mono max-h-48 overflow-y-auto p-2 space-y-1">
                {dedupeResult.error ? (
                  <p className="text-red-600 dark:text-red-400">{dedupeResult.error}</p>
                ) : (
                  <>
                    <p>
                      <span className="text-muted-foreground">Mode:</span> {dedupeResult.mode}{' '}
                      <span className="text-muted-foreground">| removed:</span> {dedupeResult.totalRemoved ?? 0}{' '}
                      <span className="text-muted-foreground">| months touched:</span> {dedupeResult.monthsTouched ?? 0}
                    </p>
                    {dedupeResult.hint ? (
                      <p className="text-muted-foreground">{dedupeResult.hint}</p>
                    ) : null}
                    {dedupeResult.steps && dedupeResult.steps.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-0.5">
                        {dedupeResult.steps.map((s, i) => (
                          <li key={`${s.entityType}-${s.monthKey}-${i}`}>
                            {s.entityType} {s.monthKey}: {s.before} → {s.after} (−{s.removed})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No duplicate ids found in scanned months.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Notification preferences will be configured here</p>
                <p className="text-sm">Email alerts, system notifications, and reminder settings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Account management will be configured here</p>
                <p className="text-sm">Profile settings, security preferences, and account information</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
