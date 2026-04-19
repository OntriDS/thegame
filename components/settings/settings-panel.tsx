'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ItemsImportExport from '@/components/settings/items-import-export';
import { TimezoneSettingsCard } from '@/components/settings/timezone-settings-card';
import { Database } from 'lucide-react';

export function SettingsPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TimezoneSettingsCard />
      
      {/* CSV Import/Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            CSV Import/Export
          </CardTitle>
          <CardDescription>
            Import and export items using CSV files for bulk operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemsImportExport />
        </CardContent>
      </Card>
    </div>
  );
}
