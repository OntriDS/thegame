'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { CompanyMonthlySummary, SummaryTotals } from '@/types/entities';
import { formatCurrency } from '@/lib/utils/financial-utils';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';

interface CompanyFinancesTabProps {
  selectedMonthKey: string;
  atomicSummary: SummaryTotals | null;
  companySummary: CompanyMonthlySummary | null;
  isLoading: boolean;
}

export function CompanyFinancesTab({ 
  selectedMonthKey, 
  atomicSummary, 
  companySummary, 
  isLoading 
}: CompanyFinancesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Finances - {formatMonthKey(selectedMonthKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Jungle Coins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {atomicSummary?.jungleCoins || 0} J$
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading station breakdowns...</p>
          </div>
        ) : (
          ['ADMIN', 'RESEARCH', 'ARTDESIGN', 'MAKERSPACE', 'SALES'].map((area: string) => {
            const areaStations = (BUSINESS_STRUCTURE as any)[area] || [];

            return (
              <Card key={area} className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">{area} Area</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {areaStations.map((station: string) => {
                      const breakdown = companySummary?.categoryBreakdown[station];
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
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
