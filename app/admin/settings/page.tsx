'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, User, Cog, Database } from "lucide-react";
import { useState } from "react";
import { 
  DAY_IN_MS, 
  STATUS_DISPLAY_LONG 
} from '@/lib/constants/app-constants';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { AdminSettingsTab } from '@/components/settings/admin-settings-tab';
import { SystemSettingsTab } from '@/components/settings/system-settings-tab';
import { LinkRulesTab } from '@/components/research/link-rules-tab';
import SeedDataPage from '@/app/admin/seed-data/page';


export default function SettingsPage() {
  const [status, setStatus] = useState<string>('');


  return (
    <div className="space-y-8">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="seed-data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Seed Data
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Admin
          </TabsTrigger>
          <TabsTrigger value="link-rules" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Link Rules
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <SettingsPanel onStatusUpdate={setStatus} />
        </TabsContent>
        <TabsContent value="seed-data" className="space-y-4">
          <SeedDataPage />
        </TabsContent>
        <AdminSettingsTab />
        <LinkRulesTab />
        <SystemSettingsTab />
      </Tabs>
    </div>
  );
}