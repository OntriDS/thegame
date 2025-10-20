'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass } from 'lucide-react';

export function RoadmapsTab() {
  return (
    <TabsContent value="roadmaps" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Roadmap</CardTitle>
          <CardDescription>Long-term strategic planning and vision</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Compass className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Strategic roadmap content will be displayed here</p>
            <p className="text-sm">Long-term planning and strategic vision</p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
