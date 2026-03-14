'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingBag, BarChart3, Grid3x3, TrendingUp } from 'lucide-react';
import { SummaryTotals } from '@/types/entities';
import { formatCurrency } from '@/lib/utils/financial-utils';
import {
  ChannelPerformance,
  ProductChannelMatrix,
} from '@/lib/analytics/financial-analytics';

interface SalesPerformanceTabProps {
  selectedMonthKey: string;
  filterByMonth: boolean;
  atomicSummary: SummaryTotals | null;
}

export function SalesPerformanceTab({
  selectedMonthKey,
  filterByMonth,
  atomicSummary,
}: SalesPerformanceTabProps) {
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [productChannelMatrix, setProductChannelMatrix] = useState<ProductChannelMatrix>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadSalesAnalytics = useCallback(async () => {
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

      const [channelsRes, matrixRes] = await Promise.all([
        safeFetch('/api/analytics/channel-performance', params),
        safeFetch('/api/analytics/product-channel-matrix', params)
      ]);

      if (channelsRes.success) setChannelPerformance(channelsRes.data);
      if (matrixRes.success) setProductChannelMatrix(matrixRes.data);
    } catch (err) {
      console.error("Failed to load sales analytics", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonthKey, filterByMonth]);

  useEffect(() => {
    loadSalesAnalytics();
  }, [loadSalesAnalytics]);

  return (
    <div className="space-y-6">
      {/* Atomic Sales KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales Volume</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              {atomicSummary?.salesVolume || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total successful transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Revenue</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {formatCurrency(atomicSummary?.revenue || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total income before costs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Ticket</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency((atomicSummary?.revenue || 0) / (atomicSummary?.salesVolume || 1))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Revenue per sale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Sales Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {channelPerformance.length === 0 ? (
                  <p className="text-sm text-center py-8 text-muted-foreground">No channel data available</p>
                ) : (
                  channelPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue).map(channel => (
                    <div key={channel.salesChannel} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{channel.salesChannel}</span>
                        <span>{formatCurrency(channel.totalRevenue)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.max(5, (channel.totalRevenue / Math.max(...channelPerformance.map(c => c.totalRevenue))) * 100)}%`
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

        {/* Product Channel Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              Channel x Product Matrix
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
                      <th className="text-left pb-2 font-medium">Channel / Product</th>
                      {Object.keys(productChannelMatrix[Object.keys(productChannelMatrix)[0]] || {}).map(prod => (
                        <th key={prod} className="text-right pb-2 font-medium px-2">{prod}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(productChannelMatrix).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">No matrix data available</td>
                      </tr>
                    ) : (
                      Object.entries(productChannelMatrix).map(([channel, products]) => (
                        <tr key={channel} className="border-b last:border-0">
                          <td className="py-2 font-medium">{channel}</td>
                          {Object.values(products).map((value: any, idx) => (
                            <td key={idx} className="text-right py-2 px-2">{formatCurrency(value.revenue as number)}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
