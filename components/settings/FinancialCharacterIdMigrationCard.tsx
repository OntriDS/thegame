"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export function FinancialCharacterIdMigrationCard() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle>Financial Character ID Migration</CardTitle>
        <CardDescription>
          This migration has been completed and removed from active operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-3 flex gap-3 text-sm text-green-800 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p><strong>Legacy migration retired:</strong> `customerCharacterId` is no longer part of active FinancialRecord migration workflows.</p>
        </div>
      </CardContent>
    </Card>
  );
}

