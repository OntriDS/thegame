'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";

export default function ArchivePage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">View all completed missions and tasks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sold Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Historical sales records and analytics</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Past Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Archive of past sales sessions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Historical reports and analytics</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 