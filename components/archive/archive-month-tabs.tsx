'use client';

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailableArchiveMonth } from "@/types/archive";

interface ArchiveMonthTabsProps {
  months: AvailableArchiveMonth[];
  activeMonthKey: string | null;
  onSelectMonth: (key: string) => void;
}

function ArchiveMonthTabsComponent({
  months,
  activeMonthKey,
  onSelectMonth,
}: ArchiveMonthTabsProps) {
  if (months.length === 0) {
    return (
      <div className="border border-dashed rounded-xl p-12 text-center text-muted-foreground">
        <p className="text-base">No archive boxes available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => {
        const isActive = month.key === activeMonthKey;
        return (
          <Card
            key={month.key}
            className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              isActive && "border-primary shadow-md"
            )}
            onClick={() => onSelectMonth(month.key)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{month.label}</span>
                {isActive && (
                  <span className="text-xs font-medium text-primary">Active</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground mb-1">Tasks</dt>
                  <dd>{month.summary.tasks}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground mb-1">Sales</dt>
                  <dd>{month.summary.sales}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground mb-1">Financials</dt>
                  <dd>{month.summary.financials}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground mb-1">Items</dt>
                  <dd>{month.summary.items}</dd>
                </div>

              </dl>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMonth(month.key);
                }}
              >
                Open Box
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const ArchiveMonthTabs = memo(ArchiveMonthTabsComponent);
ArchiveMonthTabs.displayName = "ArchiveMonthTabs";

export default ArchiveMonthTabs;

