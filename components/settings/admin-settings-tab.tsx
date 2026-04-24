'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Package, User, DollarSign } from 'lucide-react';

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
              <CardTitle>Task administration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Character counterparty field is <code className="text-xs">Task.characterId</code>. No data migrations in use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Financial counterparty field is <code className="text-xs">FinancialRecord.characterId</code>. Sales use{' '}
                <code className="text-xs">Sale.characterId</code> for the customer / counterparty character. No KV field migrations in use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory administration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Item owner field is <code className="text-xs">Item.characterId</code>. No data migrations in use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="player" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Character Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Player and character settings (no one-off data migrations in use).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
