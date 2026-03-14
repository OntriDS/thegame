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

import { CompanyFinancesTab } from '@/components/dashboards/CompanyFinancesTab';
import { PersonalFinancesTab } from '@/components/dashboards/PersonalFinancesTab';
import { SalesPerformanceTab } from '@/components/dashboards/SalesPerformanceTab';
import { ItemPerformanceTab } from '@/components/dashboards/ItemPerformanceTab';
import { TaskPerformanceTab } from '@/components/dashboards/TaskPerformanceTab';

export default function DashboardsPage() {
  const { getPreference, setPreference, isLoading: preferencesLoading } = useUserPreferences();
  const [filterByMonth, setFilterByMonth] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [atomicSummary, setAtomicSummary] = useState<SummaryTotals | null>(null);
  const [companySummary, setCompanySummary] = useState<CompanyMonthlySummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<PersonalMonthlySummary | null>(null);
  const [activeTab, setActiveTab] = useState('company-finances');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAtomicLoading, setIsAtomicLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!preferencesLoading) {
      const savedFilter = getPreference('dashboards-filter-by-month', true);
      setFilterByMonth(savedFilter);
    }
  }, [preferencesLoading, getPreference]);

  // Load available months
  useEffect(() => {
    const loadMonths = async () => {
      try {
        const months = await ClientAPI.getAvailableSummaryMonths();
        setAvailableMonths(sortMonthKeys(months));
      } catch (err) {
        console.error("Failed to load summary months", err);
      }
    };
    loadMonths();
  }, []);

  const loadSummaries = useCallback(async () => {
    setIsAtomicLoading(true);
    setIsDetailLoading(true);
    try {
      // 1. Atomic Summary (Used by almost all tabs)
      const atomic = await ClientAPI.getSummary(
        filterByMonth ? selectedMonthKey : undefined
      );
      setAtomicSummary(atomic);
      setIsAtomicLoading(false);

      // 2. Financial Summaries
      const [mm, yy] = selectedMonthKey.split('-');
      const monthNum = parseInt(mm, 10);
      const yearNum = 2000 + parseInt(yy, 10);

      const records = await ClientAPI.getFinancialRecords(monthNum, yearNum);

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
      console.error("Failed to load dashboard summaries", err);
    } finally {
      setIsDetailLoading(false);
      setIsAtomicLoading(false);
    }
  }, [selectedMonthKey, filterByMonth]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries, refreshKey]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          Command Center
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border shadow-sm">
            <span className="text-xs font-medium text-slate-500">Filter by Month</span>
            <Switch
              checked={filterByMonth}
              onCheckedChange={(val) => {
                setFilterByMonth(val);
                setPreference('dashboards-filter-by-month', val);
              }}
            />
          </div>
          <MonthSelector
            selectedMonth={selectedMonthKey}
            onChange={setSelectedMonthKey}
            availableMonths={availableMonths}
            disabled={!filterByMonth}
          />
          <Button
            size="sm"
            variant="outline"
            className="rounded-full px-4"
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={isAtomicLoading || isDetailLoading}
          >
            Refresh
          </Button>
        </div>
      </div>
      <Tabs defaultValue="company-finances" onValueChange={setActiveTab} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border shadow-sm inline-flex">
          <TabsList className="bg-transparent border-none">
            <TabsTrigger value="company-finances" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Company Finances
            </TabsTrigger>
            <TabsTrigger value="personal-finances" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Personal Finances
            </TabsTrigger>
            <TabsTrigger value="sales-performance" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Sales Performance
            </TabsTrigger>
            <TabsTrigger value="item-performance" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Item Performance
            </TabsTrigger>
            <TabsTrigger value="task-performance" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Task Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="company-finances" className="space-y-4 mt-2">
          <CompanyFinancesTab
            selectedMonthKey={selectedMonthKey}
            atomicSummary={atomicSummary}
            companySummary={companySummary}
            isLoading={isDetailLoading}
          />
        </TabsContent>

        <TabsContent value="personal-finances" className="space-y-4 mt-2">
          <PersonalFinancesTab
            selectedMonthKey={selectedMonthKey}
            personalSummary={personalSummary}
            isLoading={isDetailLoading}
          />
        </TabsContent>

        <TabsContent value="sales-performance" className="space-y-4 mt-2">
          <SalesPerformanceTab
            selectedMonthKey={selectedMonthKey}
            filterByMonth={filterByMonth}
            atomicSummary={atomicSummary}
          />
        </TabsContent>

        <TabsContent value="item-performance" className="space-y-4 mt-2">
          <ItemPerformanceTab
            selectedMonthKey={selectedMonthKey}
            filterByMonth={filterByMonth}
            atomicSummary={atomicSummary}
          />
        </TabsContent>

        <TabsContent value="task-performance" className="mt-2">
          <TaskPerformanceTab atomicSummary={atomicSummary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
