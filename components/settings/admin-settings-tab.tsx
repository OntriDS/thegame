'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, DollarSign, Package, User } from 'lucide-react';

export function AdminSettingsTab() {
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
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Financial management settings will be configured here</p>
                <p className="text-sm">Currency preferences, tax settings, and reporting options</p>
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
