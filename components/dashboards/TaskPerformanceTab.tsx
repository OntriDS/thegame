'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckSquare, TrendingUp } from 'lucide-react';
import { SummaryTotals } from '@/types/entities';
import { formatCurrency } from '@/lib/utils/financial-utils';

interface TaskPerformanceTabProps {
  atomicSummary: SummaryTotals | null;
}

export function TaskPerformanceTab({ atomicSummary }: TaskPerformanceTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3 text-center">
          <CardDescription>Operational Engine</CardDescription>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <CheckSquare className="h-8 w-8 text-purple-600" />
            {atomicSummary?.taskCount || 0}
          </CardTitle>
          <CardTitle className="text-sm text-muted-foreground">Tasks Completed</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground border-t pt-4">
          This month&apos;s completed operational actions.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 text-center">
          <CardDescription>Productivity Ratio</CardDescription>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 text-green-600">
            <TrendingUp className="h-8 w-8" />
            {formatCurrency((atomicSummary?.profit || 0) / (atomicSummary?.taskCount || 1))}
          </CardTitle>
          <CardTitle className="text-sm text-muted-foreground">Profit per Task</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground border-t pt-4">
          Average value generated per completed task.
        </CardContent>
      </Card>
    </div>
  );
}
