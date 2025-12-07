'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientAPI } from '@/lib/client-api';
import { FinancialRecord } from '@/types/entities';
import { FinancialStatus } from '@/types/enums';
import { aggregateRecordsByStation, calculateTotals } from '@/lib/utils/financial-utils';
import { formatCurrency } from '@/lib/utils/financial-utils';
import { getCurrentMonth, getMonthName, MONTHS } from '@/lib/constants/date-constants';
import { TrendingUp, TrendingDown, Calendar, Archive, ShoppingCart, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MonthlyCashflowData {
  year: number;
  month: number;
  totalRevenue: number;
  totalCost: number;
  netCashflow: number;
  companyRevenue: number;
  companyCost: number;
  companyNet: number;
  personalRevenue: number;
  personalCost: number;
  personalNet: number;
  recordCount: number;
  pendingCount: number;
}

interface MonthlyHistoricalCashflowsProps {
  className?: string;
  year?: number;
  month?: number;
}

export function MonthlyHistoricalCashflows({ className, year, month }: MonthlyHistoricalCashflowsProps) {
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(month || getCurrentMonth());
  const [allFinancials, setAllFinancials] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCollectConfirm, setShowCollectConfirm] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // Sync state with props when they change
  useEffect(() => {
    if (year !== undefined) setSelectedYear(year);
    if (month !== undefined) setSelectedMonth(month);
  }, [year, month]);

  // Generate year options (current year and 3 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const options = [];
    for (let year = currentYear; year >= currentYear - 3; year--) {
      options.push(year);
    }
    return options;
  }, [currentYear]);

  // Load all financial data
  useEffect(() => {
    const loadFinancials = async () => {
      setLoading(true);
      try {
        const financials = await ClientAPI.getFinancialRecords();
        setAllFinancials(financials);
      } catch (error) {
        console.error('Failed to load financials:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinancials();
  }, []);

  // Calculate cashflow data for selected month
  const monthlyData = useMemo((): MonthlyCashflowData | null => {
    if (allFinancials.length === 0) return null;

    // Filter financials for selected month
    const monthFinancials = allFinancials.filter(financial =>
      financial.year === selectedYear &&
      financial.month === selectedMonth
    );

    if (monthFinancials.length === 0) return null;

    // Separate by type and status
    const allCompanyFinancials = monthFinancials.filter(f => f.type === 'company');
    const allPersonalFinancials = monthFinancials.filter(f => f.type === 'personal');
    const pendingFinancials = monthFinancials.filter(f => f.status === FinancialStatus.PENDING);

    // IMPORTANT: Only include non-PENDING records in cashflow calculations
    const companyFinancials = allCompanyFinancials.filter(f => f.status !== FinancialStatus.PENDING);
    const personalFinancials = allPersonalFinancials.filter(f => f.status !== FinancialStatus.PENDING);

    // Calculate totals for each type (excluding PENDING)
    const companyBreakdown = aggregateRecordsByStation(companyFinancials, []);
    const personalBreakdown = aggregateRecordsByStation(personalFinancials, []);

    const companyTotals = companyBreakdown && Object.keys(companyBreakdown).length > 0
      ? calculateTotals(companyBreakdown)
      : { totalRevenue: 0, totalCost: 0, net: 0, totalJungleCoins: 0 };

    const personalTotals = personalBreakdown && Object.keys(personalBreakdown).length > 0
      ? calculateTotals(personalBreakdown)
      : { totalRevenue: 0, totalCost: 0, net: 0, totalJungleCoins: 0 };

    const totalTotals = {
      totalRevenue: companyTotals.totalRevenue + personalTotals.totalRevenue,
      totalCost: companyTotals.totalCost + personalTotals.totalCost,
      net: companyTotals.net + personalTotals.net,
      totalJungleCoins: companyTotals.totalJungleCoins + personalTotals.totalJungleCoins
    };

    return {
      year: selectedYear,
      month: selectedMonth,
      totalRevenue: totalTotals.totalRevenue,
      totalCost: totalTotals.totalCost,
      netCashflow: totalTotals.net,
      companyRevenue: companyTotals.totalRevenue,
      companyCost: companyTotals.totalCost,
      companyNet: companyTotals.net,
      personalRevenue: personalTotals.totalRevenue,
      personalCost: personalTotals.totalCost,
      personalNet: personalTotals.net,
      recordCount: monthFinancials.length,
      pendingCount: pendingFinancials.length
    };
  }, [allFinancials, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Historical Cashflows
          </CardTitle>
          <CardDescription>Loading financial data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Historical Cashflows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-orange-500/50 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={() => setShowCollectConfirm(true)}
            >
              <Archive className="w-3.5 h-3.5" />
              Collect Financials
            </Button>

            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
        <CardDescription>
          {monthlyData ?
            `Showing cashflow for ${getMonthName(selectedMonth)} ${selectedYear}` :
            `No financial data found for ${getMonthName(selectedMonth)} ${selectedYear}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {monthlyData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(monthlyData.totalRevenue)}
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-foreground/50" />
                </div>
              </Card>

              <Card className="p-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-semibold text-foreground/70">
                      {formatCurrency(monthlyData.totalCost)}
                    </p>
                  </div>
                  <TrendingDown className="w-6 h-6 text-foreground/40" />
                </div>
              </Card>

              <Card className="p-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Cashflow</p>
                    <p className={`text-2xl font-semibold ${monthlyData.netCashflow >= 0 ? 'text-foreground' : 'text-foreground/70'}`}>
                      {formatCurrency(monthlyData.netCashflow)}
                    </p>
                  </div>
                  {monthlyData.netCashflow >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-foreground/50" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-foreground/40" />
                  )}
                </div>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Breakdown */}
              <Card className="p-4 border border-border/50">
                <h3 className="font-medium mb-3 text-foreground/90">Company Financials</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(monthlyData.companyRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium text-foreground/70">
                      {formatCurrency(monthlyData.companyCost)}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-2.5 mt-2.5">
                    <div className="flex justify-between font-semibold text-sm">
                      <span className="text-foreground/80">Net:</span>
                      <span className={monthlyData.companyNet >= 0 ? 'text-foreground' : 'text-foreground/70'}>
                        {formatCurrency(monthlyData.companyNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Personal Breakdown */}
              <Card className="p-4 border border-border/50">
                <h3 className="font-medium mb-3 text-foreground/90">Personal Financials</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(monthlyData.personalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium text-foreground/70">
                      {formatCurrency(monthlyData.personalCost)}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-2.5 mt-2.5">
                    <div className="flex justify-between font-semibold text-sm">
                      <span className="text-foreground/80">Net:</span>
                      <span className={monthlyData.personalNet >= 0 ? 'text-foreground' : 'text-foreground/70'}>
                        {formatCurrency(monthlyData.personalNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Record Summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
              <span>{monthlyData.recordCount} total records</span>
              {monthlyData.pendingCount > 0 && (
                <span className="text-muted-foreground/70">
                  {monthlyData.pendingCount} pending records (excluded from totals)
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No financial data available for the selected period</p>
          </div>
        )}
      </CardContent>

      <Dialog open={showCollectConfirm} onOpenChange={setShowCollectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Financials</DialogTitle>
            <DialogDescription>
              Are you sure you want to collect ALL done financials for <strong>{getMonthName(selectedMonth)} {selectedYear}</strong>?
              <br /><br />
              This will create archive snapshots and mark them as collected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectConfirm(false)} disabled={isCollecting}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsCollecting(true);
                try {
                  const res = await fetch('/api/financials/collect-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: selectedMonth, year: selectedYear })
                  });

                  const data = await res.json();

                  if (res.ok) {
                    setShowCollectConfirm(false);
                    // Use a simple toast or alert - simpler for now as we don't have Toast context handy in this file context check
                    // But we can fallback to window.alert or just refresh
                    // alert(`Successfully collected ${data.collected} financial records!`);
                    // Reload financials
                    const financials = await ClientAPI.getFinancialRecords();
                    setAllFinancials(financials);
                  } else {
                    alert(`Error: ${data.error || 'Failed to collect financials'}`);
                  }
                } catch (e: any) {
                  alert('Failed to collect financials: ' + e.message);
                } finally {
                  setIsCollecting(false);
                }
              }}
              disabled={isCollecting}
            >
              {isCollecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}