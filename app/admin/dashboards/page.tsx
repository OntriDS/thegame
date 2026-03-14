'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import {
  FinancialRecord,
  CompanyMonthlySummary,
  PersonalMonthlySummary,
} from '@/types/entities';
import { Building2, User, TrendingUp, TrendingDown, BarChart3, Grid3x3, Calendar, ShoppingBag, Package, CheckSquare, Layers } from 'lucide-react';
import { MONTHS, getYearRange, getMonthName, getCurrentMonth } from '@/lib/constants/date-constants';
import { formatMonthKey, getCurrentMonthKey, sortMonthKeys } from '@/lib/utils/date-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { getCompanyAreas, getPersonalAreas } from '@/lib/utils/business-structure-utils';
import { MonthSelector } from '@/components/ui/month-selector';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { SummaryTotals } from '@/types/entities';
import {
  aggregateRecordsByStation,
  calculateTotals,
  formatDecimal,
  formatCurrency,
} from '@/lib/utils/financial-utils';
import type {
  ProductPerformance,
  ChannelPerformance,
  ProductChannelMatrix,
} from '@/lib/analytics/financial-analytics';

export default function DashboardsPage() {
  const { getPreference, setPreference, isLoading: preferencesLoading } = useUserPreferences();
  const [filterByMonth, setFilterByMonth] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [atomicSummary, setAtomicSummary] = useState<SummaryTotals | null>(null);
  const [companySummary, setCompanySummary] = useState<CompanyMonthlySummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<PersonalMonthlySummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAtomicLoading, setIsAtomicLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Analytics data
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [productChannelMatrix, setProductChannelMatrix] = useState<ProductChannelMatrix>({});
  const [costsByProductStation, setCostsByProductStation] = useState<Record<string, { cost: number; recordCount: number }>>({});
  const [revenuesByProductStation, setRevenuesByProductStation] = useState<Record<string, { revenue: number; transactionCount: number }>>({});
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!preferencesLoading) {
      const savedFilter = getPreference('dashboards-filter-by-month', true);
      setFilterByMonth(savedFilter);
    }
  }, [preferencesLoading, getPreference]);

  const handleFilterToggle = (checked: boolean) => {
    setFilterByMonth(checked);
    setPreference('dashboards-filter-by-month', checked);
  };

  // Load available months once
  useEffect(() => {
    const loadMonths = async () => {
      try {
        const months = await ClientAPI.getAvailableSummaryMonths();
        const current = getCurrentMonthKey();
        const allMonths = months.includes(current) ? months : [current, ...months];
        setAvailableMonths(sortMonthKeys(allMonths));
      } catch (err) {
        setAvailableMonths([getCurrentMonthKey()]);
      }
    };
    loadMonths();
  }, []);

  const loadSummaries = useCallback(async () => {
    const [mm, yy] = selectedMonthKey.split('-');
    const monthNum = parseInt(mm, 10);
    const yearNum = 2000 + parseInt(yy, 10);

    // 1. Fetch Atomic Summary (INSTANT & NON-BLOCKING)
    setIsAtomicLoading(true);
    ClientAPI.getSummary(selectedMonthKey)
      .then(setAtomicSummary)
      .finally(() => setIsAtomicLoading(false));

    // 2. Fetch Full Detailed Summary (O(N) - BACKGROUND)
    setIsDetailLoading(true);
    try {
      const records = filterByMonth
        ? await ClientAPI.getFinancialRecords(monthNum, yearNum)
        : await ClientAPI.getFinancialRecords();

      const companyRecords = records.filter(r => r.type === 'company');
      const personalRecords = records.filter(r => r.type === 'personal');

      // Aggregate
      const companyAreas = getCompanyAreas();
      const companyStations = companyAreas.flatMap(area => (BUSINESS_STRUCTURE as any)[area] || []);
      const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
      const companyTotals = calculateTotals(companyBreakdown);

      const personalStations = BUSINESS_STRUCTURE.PERSONAL;
      const personalBreakdown = aggregateRecordsByStation(personalRecords, personalStations as any);
      const personalTotals = calculateTotals(personalBreakdown);

      setCompanySummary({
        year: yearNum,
        month: monthNum,
        totalRevenue: companyTotals.totalRevenue,
        totalCost: companyTotals.totalCost,
        netCashflow: companyTotals.net,
        totalJungleCoins: companyTotals.totalJungleCoins,
        categoryBreakdown: companyBreakdown
      });

      setPersonalSummary({
        year: yearNum,
        month: monthNum,
        totalRevenue: personalTotals.totalRevenue,
        totalCost: personalTotals.totalCost,
        netCashflow: personalTotals.net,
        totalJungleCoins: personalTotals.totalJungleCoins,
        categoryBreakdown: personalBreakdown
      });
    } catch (err) {
      console.error("Failed to load dashboard detail breakdown", err);
    } finally {
      setIsDetailLoading(false);
    }
  }, [selectedMonthKey, filterByMonth]);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [mm, yy] = selectedMonthKey.split('-');
      const monthNum = parseInt(mm, 10);
      const yearNum = 2000 + parseInt(yy, 10);

      const params = {
        year: monthNum,
        month: yearNum,
        filterByMonth
      };

      // Load all analytics in parallel via API routes
      const [
        productsRes,
        channelsRes,
        matrixRes,
        costsRes,
        revenuesRes
      ] = await Promise.all([
        fetch('/api/analytics/product-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }),
        fetch('/api/analytics/channel-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }),
        fetch('/api/analytics/product-channel-matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }),
        fetch('/api/analytics/costs-by-product-station', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }),
        fetch('/api/analytics/revenues-by-product-station', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        })
      ]);

      const [productsData, channelsData, matrixData, costsData, revenuesData] = await Promise.all([
        productsRes.json(),
        channelsRes.json(),
        matrixRes.json(),
        costsRes.json(),
        revenuesRes.json()
      ]);

      if (productsData.success) setProductPerformance(productsData.data);
      if (channelsData.success) setChannelPerformance(channelsData.data);
      if (matrixData.success) setProductChannelMatrix(matrixData.data);
      if (costsData.success) setCostsByProductStation(costsData.data);
      if (revenuesData.success) setRevenuesByProductStation(revenuesData.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [selectedMonthKey, filterByMonth]);

  useEffect(() => {
    loadSummaries();
    loadAnalytics();
  }, [loadSummaries, loadAnalytics]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground">
            Multi-dimensional business performance analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector
            selectedMonth={selectedMonthKey}
            availableMonths={availableMonths}
            onChange={setSelectedMonthKey}
          />
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
            <Switch
              checked={filterByMonth}
              onCheckedChange={handleFilterToggle}
            />
            <span className="text-sm text-muted-foreground">Filter by month</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="company-finances" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company-finances">Company Finances</TabsTrigger>
          <TabsTrigger value="personal-finances">Personal Finances</TabsTrigger>
          <TabsTrigger value="sales-performance">Sales Performance</TabsTrigger>
          <TabsTrigger value="item-performance">Item Performance</TabsTrigger>
          <TabsTrigger value="task-performance">Task Performance</TabsTrigger>
        </TabsList>

        {/* Company Monthly Finances Tab */}
        <TabsContent value="company-finances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Monthly Finances - {formatMonthKey(selectedMonthKey)}
              </CardTitle>
              <CardDescription>
                Financial breakdown by process station
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jungle Coins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {atomicSummary?.jungleCoins || 0} J$
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Station breakdowns will show here */}

              {/* Company Stations by Area */}
              {isDetailLoading ? (
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
                        <CardTitle className="text-lg">{area} Area</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {areaStations.map((station: string) => {
                            const breakdown = companySummary?.categoryBreakdown[station];
                            const net = breakdown ? breakdown.net : 0;

                            return (
                              <Card key={station} className="border-muted">
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
        </TabsContent>

        {/* Personal Monthly Finances Tab */}
        <TabsContent value="personal-finances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Monthly Finances - {formatMonthKey(selectedMonthKey)}
              </CardTitle>
              <CardDescription>
                Personal financial breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jungle Coins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {personalSummary?.totalJungleCoins || 0} J$
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Personal Stations */}
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading personal categories...</p>
                </div>
              ) : (
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Personal Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(BUSINESS_STRUCTURE.PERSONAL as unknown as string[]).map((station: string) => {
                        const data = personalSummary?.categoryBreakdown[station];
                        const net = data ? data.net : 0;

                        return (
                          <Card key={station} className="border-muted">
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
                                {data ? (
                                  <>
                                    <div>Revenue: {formatCurrency(data.revenue)}</div>
                                    <div>Cost: {formatCurrency(data.cost)}</div>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Performance Tab */}
        <TabsContent value="sales-performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <ShoppingBag className="h-4 w-4" />
                  Total Sales Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{atomicSummary?.salesVolume || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Transactions this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Gross Sales Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(atomicSummary?.salesRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Direct from sales records</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  Avg. Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency((atomicSummary?.salesRevenue || 0) / (atomicSummary?.salesVolume || 1))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Revenue per sale</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue by Sales Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : channelPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No channel data</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {channelPerformance.map(channel => (
                    <Card key={channel.salesChannel} className="border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{channel.salesChannel}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(channel.totalRevenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">{channel.transactionCount} Sales</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5" />
                Channel × Product Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 text-left text-sm">Product</th>
                        {Array.from(new Set(Object.values(productChannelMatrix).flatMap(p => Object.keys(p)))).map(channel => (
                          <th key={channel} className="border p-2 text-right text-xs">{channel}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(productChannelMatrix).map(([product, channels]) => (
                        <tr key={product}>
                          <td className="border p-2 text-sm font-medium">{product}</td>
                          {Array.from(new Set(Object.values(productChannelMatrix).flatMap(p => Object.keys(p)))).map(channel => (
                            <td key={channel} className="border p-2 text-right text-xs">
                              {formatCurrency(channels[channel]?.revenue || 0)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Performance Tab */}
        <TabsContent value="item-performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Items Sold
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{atomicSummary?.itemsSold || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total quantity</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Inventory Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(atomicSummary?.inventoryValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estimated sale value</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  Inventory Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(atomicSummary?.inventoryCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Investment in stock</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Product Type Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {productPerformance.map(product => (
                    <Card key={product.itemType} className="border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{product.itemType}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Profit:</span>
                          <span className={product.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(product.netProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Qty:</span>
                          <span>{product.quantitySold}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Costs by Production Station
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(costsByProductStation).map(([station, data]) => (
                    <div key={station} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="text-sm font-medium">{station}</span>
                      <span className="text-sm text-red-600 font-bold">{formatCurrency(data.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Performance Tab */}
        <TabsContent value="task-performance" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
