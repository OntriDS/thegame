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
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

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
}

export function MonthlyHistoricalCashflows({ className }: MonthlyHistoricalCashflowsProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [allFinancials, setAllFinancials] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(false);

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
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(monthlyData.totalRevenue)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(monthlyData.totalCost)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Cashflow</p>
                    <p className={`text-2xl font-bold ${monthlyData.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(monthlyData.netCashflow)}
                    </p>
                  </div>
                  {monthlyData.netCashflow >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Breakdown */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Company Financials</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(monthlyData.companyRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(monthlyData.companyCost)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Net:</span>
                      <span className={monthlyData.companyNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(monthlyData.companyNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Personal Breakdown */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Personal Financials</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(monthlyData.personalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(monthlyData.personalCost)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Net:</span>
                      <span className={monthlyData.personalNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(monthlyData.personalNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Record Summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{monthlyData.recordCount} total records</span>
              {monthlyData.pendingCount > 0 && (
                <span className="text-orange-600">
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
    </Card>
  );
}