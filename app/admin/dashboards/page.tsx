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
import { Building2, User, TrendingUp, TrendingDown, BarChart3, Grid3x3 } from 'lucide-react';
import { MONTHS, getYearRange, getMonthName, getCurrentMonth } from '@/lib/constants/date-constants';
import { formatMonthYear } from '@/lib/utils/date-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { getCompanyAreas, getPersonalAreas } from '@/lib/utils/business-structure-utils';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [companySummary, setCompanySummary] = useState<CompanyMonthlySummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<PersonalMonthlySummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
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

  const loadSummaries = useCallback(async () => {
    const records = await ClientAPI.getFinancialRecords();
    const companyRecords = records.filter(r => {
      if (filterByMonth) {
        return r.year === currentYear && r.month === currentMonth && r.type === 'company';
      }
      return r.type === 'company';
    });
    const personalRecords = records.filter(r => {
      if (filterByMonth) {
        return r.year === currentYear && r.month === currentMonth && r.type === 'personal';
      }
      return r.type === 'personal';
    });
    
    // Aggregate company records by station
    const companyStations = getCompanyAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
    const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
    const companyTotals = calculateTotals(companyBreakdown);
    
    // Aggregate personal records by station
    const personalStations = BUSINESS_STRUCTURE.PERSONAL;
    const personalBreakdown = aggregateRecordsByStation(personalRecords, personalStations);
    const personalTotals = calculateTotals(personalBreakdown);
    
    // Create summaries
    const company: CompanyMonthlySummary = {
      year: currentYear,
      month: currentMonth,
      totalRevenue: companyTotals.totalRevenue,
      totalCost: companyTotals.totalCost,
      netCashflow: companyTotals.net,
      totalJungleCoins: companyTotals.totalJungleCoins,
      categoryBreakdown: companyBreakdown
    };
    
    const personal: PersonalMonthlySummary = {
      year: currentYear,
      month: currentMonth,
      totalRevenue: personalTotals.totalRevenue,
      totalCost: personalTotals.totalCost,
      netCashflow: personalTotals.net,
      totalJungleCoins: personalTotals.totalJungleCoins,
      categoryBreakdown: personalBreakdown
    };
    
    setCompanySummary(company);
    setPersonalSummary(personal);
  }, [currentYear, currentMonth, refreshKey, filterByMonth]);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const params = {
        year: currentYear,
        month: currentMonth,
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
  }, [currentYear, currentMonth, filterByMonth]);

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
          <MonthYearSelector
            currentYear={currentYear}
            currentMonth={currentMonth}
            onYearChange={setCurrentYear}
            onMonthChange={setCurrentMonth}
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

      <Tabs defaultValue="company-monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company-monthly">Company Monthly</TabsTrigger>
          <TabsTrigger value="personal-monthly">Personal Monthly</TabsTrigger>
          <TabsTrigger value="revenue-by-channel">Revenue by Channel</TabsTrigger>
          <TabsTrigger value="costs-by-product">Costs by Product</TabsTrigger>
          <TabsTrigger value="product-performance">Product Performance</TabsTrigger>
          <TabsTrigger value="channel-product-matrix">Channel × Product</TabsTrigger>
        </TabsList>

        {/* Company Monthly Finances Tab */}
        <TabsContent value="company-monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Monthly Finances - {getMonthName(currentMonth)} {currentYear}
              </CardTitle>
              <CardDescription>
                Financial breakdown by process station
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(companySummary?.totalRevenue || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(companySummary?.totalCost || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Net Cashflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      (companySummary?.netCashflow || 0) > 0 ? 'text-green-600' : 
                      (companySummary?.netCashflow || 0) < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {formatCurrency(companySummary?.netCashflow || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jungle Coins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {companySummary?.totalJungleCoins || 0} J$
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Company Stations by Area */}
              {['ADMIN', 'RESEARCH', 'DESIGN', 'PRODUCTION', 'SALES'].map(area => {
                const areaStations = BUSINESS_STRUCTURE[area as keyof typeof BUSINESS_STRUCTURE];
                
                return (
                  <Card key={area} className="mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{area} Area</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {areaStations.map(station => {
                          const breakdown = companySummary?.categoryBreakdown[station];
                          const net = breakdown ? breakdown.net : 0;
                           
                          return (
                            <Card key={station} className="border-muted">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{station}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-lg font-bold ${
                                  net === 0 ? 'text-muted-foreground' : 
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
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Monthly Finances Tab */}
        <TabsContent value="personal-monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Monthly Finances - {getMonthName(currentMonth)} {currentYear}
              </CardTitle>
              <CardDescription>
                Personal financial breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(personalSummary?.totalRevenue || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(personalSummary?.totalCost || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Net Cashflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      (personalSummary?.netCashflow || 0) > 0 ? 'text-green-600' : 
                      (personalSummary?.netCashflow || 0) < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {formatCurrency(personalSummary?.netCashflow || 0)}
                    </div>
                  </CardContent>
                </Card>
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
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Personal Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BUSINESS_STRUCTURE.PERSONAL.map(station => {
                      const breakdown = personalSummary?.categoryBreakdown[station];
                      const net = breakdown ? breakdown.net : 0;
                       
                      return (
                        <Card key={station} className="border-muted">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{station}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-lg font-bold ${
                              net === 0 ? 'text-muted-foreground' : 
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue by Sales Channel Tab */}
        <TabsContent value="revenue-by-channel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue by Sales Channel
              </CardTitle>
              <CardDescription>
                Revenue performance across different sales channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : channelPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales channel data available</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channelPerformance.map(channel => (
                      <Card key={channel.salesChannel}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{channel.salesChannel}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(channel.totalRevenue)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            <div>Transactions: {channel.transactionCount}</div>
                            <div>Avg: {formatCurrency(channel.averageTransaction)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(channelPerformance.reduce((sum, c) => sum + c.totalRevenue, 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs by Product Station Tab */}
        <TabsContent value="costs-by-product" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Costs by Product Station
              </CardTitle>
              <CardDescription>
                Production costs grouped by product station (Item.station)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : Object.keys(costsByProductStation).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No product station cost data available</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(costsByProductStation).map(([station, data]) => (
                      <Card key={station}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{station}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(data.cost)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Records: {data.recordCount}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {formatCurrency(Object.values(costsByProductStation).reduce((sum, d) => sum + d.cost, 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="product-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Product Performance
              </CardTitle>
              <CardDescription>
                Cost, revenue, and profit by product type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : productPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No product performance data available</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productPerformance.map(product => (
                      <Card key={product.itemType}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            {product.itemType}
                            {product.subItemType && (
                              <span className="text-xs text-muted-foreground ml-2">({product.subItemType})</span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cost:</span>
                            <span className="text-red-600 font-medium">{formatCurrency(product.totalCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Revenue:</span>
                            <span className="text-green-600 font-medium">{formatCurrency(product.totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-2">
                            <span className="font-medium">Net Profit:</span>
                            <span className={`font-bold ${
                              product.netProfit > 0 ? 'text-green-600' : 
                              product.netProfit < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {formatCurrency(product.netProfit)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            <div>Quantity Sold: {product.quantitySold}</div>
                            <div>Items: {product.itemIds.length}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Total Cost</div>
                          <div className="text-xl font-bold text-red-600">
                            {formatCurrency(productPerformance.reduce((sum, p) => sum + p.totalCost, 0))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total Revenue</div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(productPerformance.reduce((sum, p) => sum + p.totalRevenue, 0))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Net Profit</div>
                          <div className={`text-xl font-bold ${
                            productPerformance.reduce((sum, p) => sum + p.netProfit, 0) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(productPerformance.reduce((sum, p) => sum + p.netProfit, 0))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel × Product Matrix Tab */}
        <TabsContent value="channel-product-matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5" />
                Channel × Product Matrix
              </CardTitle>
              <CardDescription>
                2D breakdown of revenue by sales channel and product type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              ) : Object.keys(productChannelMatrix).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No matrix data available</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border p-2 text-left">Product</th>
                          {Array.from(new Set(
                            Object.values(productChannelMatrix).flatMap(product => Object.keys(product))
                          )).map(channel => (
                            <th key={channel} className="border p-2 text-right">{channel}</th>
                          ))}
                          <th className="border p-2 text-right font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(productChannelMatrix).map(([product, channels]) => {
                          const productTotal = Object.values(channels).reduce((sum, c) => sum + c.revenue, 0);
                          return (
                            <tr key={product}>
                              <td className="border p-2 font-medium">{product}</td>
                              {Array.from(new Set(
                                Object.values(productChannelMatrix).flatMap(p => Object.keys(p))
                              )).map(channel => {
                                const data = channels[channel] || { revenue: 0, quantity: 0 };
                                return (
                                  <td key={channel} className="border p-2 text-right">
                                    <div className="text-sm font-medium">{formatCurrency(data.revenue)}</div>
                                    <div className="text-xs text-muted-foreground">Qty: {data.quantity}</div>
                                  </td>
                                );
                              })}
                              <td className="border p-2 text-right font-bold">
                                {formatCurrency(productTotal)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/50">
                          <td className="border p-2 font-bold">Total</td>
                          {Array.from(new Set(
                            Object.values(productChannelMatrix).flatMap(p => Object.keys(p))
                          )).map(channel => {
                            const channelTotal = Object.values(productChannelMatrix).reduce((sum, product) => {
                              return sum + (product[channel]?.revenue || 0);
                            }, 0);
                            return (
                              <td key={channel} className="border p-2 text-right font-bold">
                                {formatCurrency(channelTotal)}
                              </td>
                            );
                          })}
                          <td className="border p-2 text-right font-bold">
                            {formatCurrency(
                              Object.values(productChannelMatrix).reduce((sum, product) => {
                                return sum + Object.values(product).reduce((s, c) => s + c.revenue, 0);
                              }, 0)
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
