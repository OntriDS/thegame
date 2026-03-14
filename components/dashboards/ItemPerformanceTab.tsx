'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, BarChart3, TrendingUp, Layers } from 'lucide-react';
import { SummaryTotals } from '@/types/entities';
import { formatCurrency } from '@/lib/utils/financial-utils';
import { ProductPerformance } from '@/lib/analytics/financial-analytics';

interface ItemPerformanceTabProps {
  selectedMonthKey: string;
  filterByMonth: boolean;
  atomicSummary: SummaryTotals | null;
}

export function ItemPerformanceTab({
  selectedMonthKey,
  filterByMonth,
  atomicSummary,
}: ItemPerformanceTabProps) {
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [costsByProductStation, setCostsByProductStation] = useState<Record<string, { cost: number; recordCount: number }>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadItemAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mm, yy] = selectedMonthKey.split('-');
      const monthNum = parseInt(mm, 10);
      const yearNum = 2000 + parseInt(yy, 10);

      const params = {
        year: yearNum,
        month: monthNum,
        filterByMonth
      };

      const safeFetch = (url: string, body: any) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(res => res.json())
          .catch(err => {
            console.error(`Failed to load ${url}:`, err);
            return { success: false, data: null };
          });

      const [productsRes, costsRes] = await Promise.all([
        safeFetch('/api/analytics/product-performance', params),
        safeFetch('/api/analytics/costs-by-product-station', params)
      ]);

      if (productsRes.success) setProductPerformance(productsRes.data);
      if (costsRes.success) setCostsByProductStation(costsRes.data);
    } catch (err) {
      console.error("Failed to load item analytics", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonthKey, filterByMonth]);

  useEffect(() => {
    loadItemAnalytics();
  }, [loadItemAnalytics]);

  return (
    <div className="space-y-6">
      {/* Atomic Item KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items Sold</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              {atomicSummary?.itemsSold || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total units moved out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory Value</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {formatCurrency(atomicSummary?.inventoryValue || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Estimated retail value in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory Cost</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">
              {formatCurrency(atomicSummary?.inventoryCost || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total production cost in stock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Product Type Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2 font-medium">Type</th>
                      <th className="text-right pb-2 font-medium px-2">Qty</th>
                      <th className="text-right pb-2 font-medium px-2">Revenue</th>
                      <th className="text-right pb-2 font-medium px-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">No product data available</td>
                      </tr>
                    ) : (
                      productPerformance.map(prod => (
                        <tr key={prod.itemType} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-2 font-medium">{prod.itemType}</td>
                          <td className="text-right py-2 px-2">{prod.quantitySold}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(prod.totalRevenue)}</td>
                          <td className="text-right py-2 px-2 text-green-600 font-medium">{formatCurrency(prod.netProfit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Costs by Production Station */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Costs by Production Station
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(costsByProductStation).length === 0 ? (
                  <p className="text-sm text-center py-8 text-muted-foreground">No station cost data available</p>
                ) : (
                  Object.entries(costsByProductStation)
                    .sort((a, b) => b[1].cost - a[1].cost)
                    .map(([station, data]) => (
                      <div key={station} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{station}</span>
                          <span className="text-red-500">{formatCurrency(data.cost)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{
                              width: `${Math.max(5, (data.cost / Math.max(...Object.values(costsByProductStation).map(d => d.cost))) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
