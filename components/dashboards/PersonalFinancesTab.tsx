'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { PersonalMonthlySummary } from '@/types/entities';
import { formatCurrency } from '@/lib/utils/financial-utils';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';

interface PersonalFinancesTabProps {
  selectedMonthKey: string;
  personalSummary: PersonalMonthlySummary | null;
  isLoading: boolean;
}

export function PersonalFinancesTab({ 
  selectedMonthKey, 
  personalSummary, 
  isLoading 
}: PersonalFinancesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Finances - {formatMonthKey(selectedMonthKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading category breakdowns...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {BUSINESS_STRUCTURE.PERSONAL.map((station: string) => {
              const breakdown = personalSummary?.categoryBreakdown[station];
              const net = breakdown ? breakdown.net : 0;

              return (
                <Card key={station} className="border-muted bg-muted/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{station}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-lg font-bold ${net === 0 ? 'text-muted-foreground' :
                      net > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {formatCurrency(net)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {breakdown ? (
                        <>
                          <div>Revenue: {formatCurrency(breakdown.revenue)}</div>
                          <div>Cost: {formatCurrency(breakdown.cost)}</div>
                        </>
                      ) : (
                        'No data'
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
