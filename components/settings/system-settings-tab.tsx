'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Bell, User, Wrench } from 'lucide-react';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { MediaMigrationCard } from './MediaMigrationCard';

export function SystemSettingsTab() {
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<any>(null);

  const handleReindexItems = async () => {
    try {
      setIsReindexing(true);
      setReindexResult(null);
      const res = await fetch('/api/init/reindex-items', { method: 'POST' });
      const data = await res.json();
      setReindexResult(data);
    } catch (err) {
      console.error(err);
      setReindexResult({ error: 'Failed to complete request.' });
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <TabsContent value="system" className="space-y-4">
      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
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

        <TabsContent value="maintenance" className="space-y-4">
          <MediaMigrationCard />
          <Card>
            <CardHeader>
              <CardTitle>Item Indexing Optimization (Active/Legacy)</CardTitle>
              <CardDescription>Rebuild the split indexes for Legacy and Active items. Do this once after migrating new item structures.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleReindexItems} 
                disabled={isReindexing}
              >
                {isReindexing ? 'Reindexing...' : 'Run Index Optimization'}
              </Button>
              {reindexResult && (
                <div className="mt-4 p-4 bg-muted border rounded-md text-sm">
                  <pre>{JSON.stringify(reindexResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
