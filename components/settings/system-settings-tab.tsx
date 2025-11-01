'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, Bell, User, FileText, AlertTriangle } from 'lucide-react';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

export function SystemSettingsTab() {
  const { getPreference, setPreference } = useUserPreferences();
  const [logManagementEnabled, setLogManagementEnabled] = useState(false);

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
