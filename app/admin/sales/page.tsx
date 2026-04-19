'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import { useEntityUpdates } from "@/lib/hooks/use-entity-updates";
import { ClientAPI } from "@/lib/client-api";
import { Sale } from "@/types/entities";
import { SaleType, SaleStatus } from "@/types/enums";
import { getSaleStatusLabel } from "@/lib/constants/status-display-labels";
import { formatDateDDMMYYYY, getMonthName } from "@/lib/constants/date-constants";
import { getAllSiteNames } from "@/lib/utils/site-options-utils";
import { Plus, Calendar, DollarSign, Package, TrendingUp, Archive, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SalesModal from "@/components/modals/sales-modal";
import { MonthSelector } from "@/components/ui/month-selector";
import { CurrencyExchangeRates, DEFAULT_CURRENCY_EXCHANGE_RATES } from "@/lib/constants/financial-constants";
import { formatCurrency, roundCurrency2 } from "@/lib/utils/financial-utils";
import { formatMonthKey } from "@/lib/utils/date-utils";
import { SalesDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';
import { useMonthlySummary } from '@/lib/hooks/use-monthly-summary';

function SalesPageContent() {
  const { activeBg } = useThemeColors();
  const [sales, setSales] = useState<Sale[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [selectedType, setSelectedType] = useState<SaleType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<SaleStatus | 'all'>('all');
  const [selectedSite, setSelectedSite] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRates>(DEFAULT_CURRENCY_EXCHANGE_RATES);
  const {
    selectedMonthKey,
    setSelectedMonthKey,
    availableMonths,
    atomicSummary,
  } = useMonthlySummary();
  const [monthlySalesProfit, setMonthlySalesProfit] = useState<number>(0);

  const isCountableSaleForSummary = useCallback((sale: Sale) => {
    return (
      sale.status === SaleStatus.CHARGED ||
      sale.status === SaleStatus.COLLECTED ||
      (sale as { isCollected?: boolean }).isCollected === true
    );
  }, []);

  const handleDeepLinkSale = useCallback((sale: Sale) => {
    setSelectedMonthKey(formatMonthKey(sale.saleDate));
    setEditingSale(sale);
    setShowSalesModal(true);
  }, []);

  // Load sales data & config
  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthKey]);

  // Filter sales based on selected criteria
  useEffect(() => {
    let filtered = sales;

    if (selectedType !== 'all') {
      filtered = filtered.filter(sale => sale.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(sale => sale.status === selectedStatus);
    }

    if (selectedSite !== 'all') {
      filtered = filtered.filter(sale => sale.siteId === selectedSite);
    }

    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    setFilteredSales(filtered);
  }, [sales, selectedType, selectedStatus, selectedSite]);

  const loadSales = async () => {
    try {
      const [mm, yy] = selectedMonthKey.split('-');
      const monthNum = parseInt(mm, 10);
      const yearNum = 2000 + parseInt(yy, 10);

      // Fetch Full Detailed Sales (O(N) - BACKGROUND)
      setIsLoading(true);
      const [salesData, sitesData, ratesData] = await Promise.all([
        ClientAPI.getSales(
          monthNum,
          yearNum
        ),
        ClientAPI.getSites(),
        ClientAPI.getFinancialConversionRates()
      ]);
      setSales(salesData);
      setSites(sitesData);
      const safeRates = ratesData && typeof ratesData.colonesToUsd === 'number'
        ? { ...DEFAULT_CURRENCY_EXCHANGE_RATES, ...ratesData }
        : DEFAULT_CURRENCY_EXCHANGE_RATES;
      setExchangeRates(safeRates);
    } catch (error) {
      console.error('Failed to load sales history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for sale updates (event-driven refresh)
  useEntityUpdates('sale', loadSales);

  const getStatusBadge = (status: SaleStatus) => {
    const statusColors: Record<SaleStatus, string> = {
      [SaleStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [SaleStatus.ON_HOLD]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [SaleStatus.CHARGED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [SaleStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      [SaleStatus.COLLECTED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };

    return (
      <Badge className={statusColors[status]}>
        {getSaleStatusLabel(status)}
      </Badge>
    );
  };

  const getTypeBadge = (type: SaleType) => {
    const typeColors = {
      [SaleType.DIRECT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      [SaleType.BOOTH]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      [SaleType.NETWORK]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      [SaleType.ONLINE]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    };

    return (
      <Badge className={typeColors[type]}>
        {type}
      </Badge>
    );
  };

  const getSaleFinancials = useCallback((sale: Sale) => {
    const grossRevenue = sale.totals.totalRevenue;
    let cost = 0;
    let netProfit = 0;

    if (sale.type === SaleType.BOOTH) {
      const exchangeRate = exchangeRates?.colonesToUsd || DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd;

      // Check for advanced contract calculation first
      // myNet is stored in Colones (CRC)
      const myNetCRC = sale.metadata?.boothSaleContext?.calculatedTotals?.myNet ??
        (sale as any).archiveMetadata?.boothSaleContext?.calculatedTotals?.myNet;

      if (myNetCRC !== undefined) {
        netProfit = myNetCRC / exchangeRate;
        // Reverse-engineer apparent cost for consistent UI structure in dashboards
        cost = grossRevenue - netProfit;
      } else {
        // Legacy calculation fallback
        const boothFeeUSD = (sale.boothFee || 0) / exchangeRate;
        const partnerPayouts = sale.lines
          .filter(l => l.kind === 'service' && (l as any).station === 'booth-sales')
          .reduce((sum, l) => sum + ((l as any).revenue || 0), 0);

        cost = boothFeeUSD + partnerPayouts;
        netProfit = grossRevenue - cost;
      }
    } else {
      const hasExplicitCost = typeof sale.totals?.totalCost === 'number';
      const explicitCost = Number(sale.totals?.totalCost ?? 0) || 0;

      // General service costs
      const serviceLineCosts = sale.lines
        .filter(l => l.kind === 'service' && (l as any).taskCost)
        .reduce((sum, l) => sum + ((l as any).taskCost || 0), 0);
      cost = hasExplicitCost ? explicitCost : serviceLineCosts;
      netProfit = grossRevenue - cost;
    }

    return { grossRevenue, cost, netProfit };
  }, [exchangeRates]);

  useEffect(() => {
    const nextMonthlySalesProfit = sales
      .filter(isCountableSaleForSummary)
      .reduce((sum, sale) => sum + getSaleFinancials(sale).netProfit, 0);
    setMonthlySalesProfit(roundCurrency2(nextMonthlySalesProfit));
  }, [sales, getSaleFinancials, isCountableSaleForSummary]);

  const handleNewSale = () => {
    setEditingSale(null);
    setShowSalesModal(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSalesModal(true);
  };

  const handleSaveSale = async (sale: Sale, force?: boolean) => {
    // We bubble the error up to SalesModal so it can handle duplicate logic/UI
    const finalSale = await ClientAPI.upsertSale(sale, { force });

    // Update editingSale with fresh data BEFORE modal closes (fixes stale UI issue)
    setEditingSale(finalSale);

    setShowSalesModal(false);
    await loadSales(); // Refresh the list
  };

  const handleDeleteSale = async () => {
    try {
      await loadSales(); // Refresh the list after deletion
    } catch (error) {
      console.error('Failed to refresh sales after deletion:', error);
    }
  };

  return (
    <div className="space-y-6">
      <SalesDeepLinkTrigger onSale={handleDeepLinkSale} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Management</h1>
          <p className="text-muted-foreground">
            Track sales performance, analyze trends, and manage transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector
            selectedMonth={selectedMonthKey}
            availableMonths={availableMonths}
            onChange={setSelectedMonthKey}
          />

          <Button className="flex items-center gap-2" onClick={handleNewSale}>
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Monthly Revenue (Atomic) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(atomicSummary?.salesRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly Total
            </p>
          </CardContent>
        </Card>

        {/* Net Profit (Detail) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit (Sales)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {formatCurrency(monthlySalesProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly total
            </p>
          </CardContent>
        </Card>

        {/* Sales Volume (Atomic) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Volume</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {atomicSummary?.salesVolume || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Transactions recorded
            </p>
          </CardContent>
        </Card>

        {/* Items Sold (Atomic) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {atomicSummary?.itemsSold || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Physical items delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-base font-medium">Active Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as SaleType | 'all')}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(SaleType).map(type => (
                    <SelectItem key={type} value={type as string}>{type as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as SaleStatus | 'all')}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.values(SaleStatus).map(status => (
                    <SelectItem key={status} value={status as string}>{getSaleStatusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Site:</span>
              <Select value={selectedSite} onValueChange={(value) => setSelectedSite(value)}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {getAllSiteNames(sites).map(site => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <p className="text-sm text-muted-foreground">
            All sales for the selected month
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-muted-foreground">Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => {
                const { grossRevenue, cost, netProfit } = getSaleFinancials(sale);
                return (
                  <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleEditSale(sale)}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sale.name}</h3>
                          {getTypeBadge(sale.type)}
                          {getStatusBadge(sale.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Date: {formatDateDDMMYYYY(new Date(sale.saleDate))}</p>
                          <p>Site: {sale.siteId}</p>
                          {sale.counterpartyName && <p>Client: {sale.counterpartyName}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-medium flex items-center gap-2 justify-end">
                          <span className="text-muted-foreground font-normal text-sm">+${grossRevenue.toFixed(2)}</span>
                          {cost > 0 && <span className="text-muted-foreground font-normal text-sm">- ${cost.toFixed(2)}</span>}
                          <span className="text-muted-foreground font-normal text-sm">=</span>
                          <span className={netProfit >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                            ${netProfit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Modal */}
      <SalesModal
        sale={editingSale}
        open={showSalesModal}
        onOpenChange={setShowSalesModal}
        onSave={handleSaveSale}
        onDelete={handleDeleteSale}
        exchangeRates={exchangeRates}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading sales…</div>}>
      <SalesPageContent />
    </Suspense>
  );
}
