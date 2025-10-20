'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboards</h1>
        <p className="text-muted-foreground">
          Comprehensive business performance overview and key metrics
        </p>
      </div>

      <Tabs defaultValue="current-month" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current-month">Current Month</TabsTrigger>
          <TabsTrigger value="historical-monthly">Historical Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="current-month" className="space-y-6">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="player">Character (Player Role)</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Current Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Company financial data for current month</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="player" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Character Progress (Current Month)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Points and achievements for characters with PLAYER role (current month)</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="historical-monthly" className="space-y-6">
          <Tabs defaultValue="company-historical" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company-historical">Company</TabsTrigger>
              <TabsTrigger value="player-historical">Character (Player Role)</TabsTrigger>
            </TabsList>

            <TabsContent value="company-historical" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Historical Monthly</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Historical company financial data by month</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="player-historical" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Character Historical (Monthly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Historical player data by month</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
} 