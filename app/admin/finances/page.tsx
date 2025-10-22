'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { ClientAPI } from '@/lib/client-api';
import { getZIndexClass, getModalZIndex } from '@/lib/utils/z-index-utils';
import { 
  FinancialRecord, 
  CompanyFinancialCategory, 
  PersonalFinancialCategory,
  CompanyMonthlySummary,
  PersonalMonthlySummary
} from '@/types/entities';
import { Plus, DollarSign, TrendingUp, TrendingDown, Building2, User } from 'lucide-react';
import { MONTHS, getYearRange, getMonthName, getCurrentMonth } from '@/lib/constants/date-constants';
import { BUSINESS_STRUCTURE, SITE_GROUPS, ItemType } from '@/types/enums';
import { getCompanyAreas, getPersonalAreas, isCompanyStation, getAreaForStation } from '@/lib/utils/business-structure-utils';
import { CompanyRecordsList, PersonalRecordsList } from '@/components/finances/financial-records-components';
import { PRICE_STEP, DECIMAL_STEP, J$_TO_USD_RATE, PRIMARY_CURRENCY, USD_CURRENCY } from '@/lib/constants/app-constants';
import { VALIDATION_CONSTANTS } from '@/lib/constants/financial-constants';
// formatMonthYear will be implemented inline
import { MonthYearSelector } from '@/components/ui/month-year-selector'
import AssetsEditModal from '@/components/modals/submodals/assets-edit-submodal'
import ConversionRatesModal from '@/components/modals/submodals/conversion-rates-submodal'
import FinancialsModal from '@/components/modals/financials-modal'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { 
  formatDecimal, 
  getCashTotal, 
  getBankTotal, 
  getBitcoinTotal, 
  getToChargeTotal, 
  getToPayTotal,
  getCoreMonetaryTotal,
  getMonetaryTotal,
  getJungleCoinsTotal,
  getInventoryTotal,
  getInventoryCost,
  getOtherAssetsTotal,
  getTotalNetWorth,
  type ExchangeRates,
  type MonetaryAssets,
  type InventoryAssets,
  type OtherAssets
} from '@/lib/utils/financial-calculations'
import {
  DEFAULT_CURRENCY_EXCHANGE_RATES,
  DEFAULT_POINTS_CONVERSION_RATES,
  FALLBACK_BITCOIN_PRICE,
  BITCOIN_SATOSHIS_PER_BTC,
  REFRESH_DELAY_MS,
  CURRENCY_SYMBOLS,
  ASSET_SECTIONS,
  ASSET_TYPES,
  type CurrencyExchangeRates,
  type PointsConversionRates,
} from '@/lib/constants/financial-constants'

// Helper function for formatting month/year
const formatMonthYear = (year: number, month: number) => {
  const monthName = getMonthName(month);
  return `${monthName} ${year}`;
};

export default function FinancesPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [companySummary, setCompanySummary] = useState<CompanyMonthlySummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<PersonalMonthlySummary | null>(null);
  const [aggregatedFinancialData, setAggregatedFinancialData] = useState<any>(null);
  const [aggregatedCategoryData, setAggregatedCategoryData] = useState<any>(null);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConversionRatesModal, setShowConversionRatesModal] = useState(false);
  const [showFinancialsModal, setShowFinancialsModal] = useState(false);
  
  // Keyboard shortcuts for modal navigation
  useKeyboardShortcuts({
    onOpenFinancialModal: () => setShowFinancialsModal(true),
  });
  const [activeTab, setActiveTab] = useState('assets');
  const [activeSubTab, setActiveSubTab] = useState('finances');

  const [isHydrated, setIsHydrated] = useState(false);
   
  // Asset state management - now using data store
  const [companyAssets, setCompanyAssets] = useState<any>(null);
  const [personalAssets, setPersonalAssets] = useState<any>(null);
  
  // Currency conversion state
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRates>(DEFAULT_CURRENCY_EXCHANGE_RATES);
  const [pointsConversionRates, setPointsConversionRates] = useState<PointsConversionRates>(DEFAULT_POINTS_CONVERSION_RATES);
  
  const [editingSection, setEditingSection] = useState<{
    type: 'company' | 'personal';
    section: 'monetary' | 'jungleCoins' | 'inventories' | 'otherAssets';
  } | null>(null);

  // Load conversion rates
  useEffect(() => {
    const loadConversionRates = async () => {
      try {
        const rates = await ClientAPI.getConversionRates();
        setPointsConversionRates(rates);
        setExchangeRates(rates);
      } catch (error) {
        console.error('Failed to load conversion rates:', error);
      }
    };
    
    loadConversionRates();
  }, []);

  const loadSummaries = useCallback(async () => {
    // For now, calculate summaries client-side from financial records
    const records = await ClientAPI.getFinancialRecords();
    const companyRecords = records.filter(r => r.year === currentYear && r.month === currentMonth && r.type === 'company');
    const personalRecords = records.filter(r => r.year === currentYear && r.month === currentMonth && r.type === 'personal');
    
    // Calculate company summary
    const totalRevenue = companyRecords.reduce((sum, r) => sum + r.revenue, 0);
    const totalCost = companyRecords.reduce((sum, r) => sum + r.cost, 0);
    const totalJungleCoins = companyRecords.reduce((sum, r) => sum + r.jungleCoins, 0);
    
    const company: CompanyMonthlySummary = {
      year: currentYear,
      month: currentMonth,
      totalRevenue,
      totalCost,
      netCashflow: totalRevenue - totalCost,
      totalJungleCoins,
      categoryBreakdown: {
        ADMIN: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 },
        RESEARCH: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 },
        DESIGN: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 },
        PRODUCTION: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 },
        SALES: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 },
        PERSONAL: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 }
      } // Will be implemented in Monthly Archive phase
    };
    
    // Calculate personal summary
    const personalTotalRevenue = personalRecords.reduce((sum, r) => sum + r.revenue, 0);
    const personalTotalCost = personalRecords.reduce((sum, r) => sum + r.cost, 0);
    const personalTotalJungleCoins = personalRecords.reduce((sum, r) => sum + r.jungleCoins, 0);
    
    const personal: PersonalMonthlySummary = {
      year: currentYear,
      month: currentMonth,
      totalRevenue: personalTotalRevenue,
      totalCost: personalTotalCost,
      netCashflow: personalTotalRevenue - personalTotalCost,
      totalJungleCoins: personalTotalJungleCoins,
      categoryBreakdown: {
        PERSONAL: { revenue: 0, cost: 0, net: 0, jungleCoins: 0 }
      } as any // Will be implemented in Monthly Archive phase
    };
    
    // For now, use empty aggregated data (will be implemented in Monthly Archive phase)
    const aggregated = {
      totalRevenue: totalRevenue,
      totalCost: totalCost,
      net: totalRevenue - totalCost,
      totalJungleCoins: totalJungleCoins
    };
    const categoryData = {
      categoryBreakdown: Object.fromEntries(
        Object.values(BUSINESS_STRUCTURE).flat().map(category => [
          category,
          { revenue: 0, cost: 0, net: 0, jungleCoins: 0 }
        ])
      )
    };
    setCompanySummary(company);
    setPersonalSummary(personal);
    setAggregatedFinancialData(aggregated);
    setAggregatedCategoryData(categoryData);
    // Force records lists to refresh
    setRecordsRefreshKey(prev => prev + 1);
  }, [currentYear, currentMonth, refreshKey]);

  // Load summaries for current month
  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // Listen for financials updates to refresh summaries
  useEffect(() => {
    const handleFinancialsUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('financialsUpdated', handleFinancialsUpdate);
    return () => {
      window.removeEventListener('financialsUpdated', handleFinancialsUpdate);
    };
  }, []);

  const fetchBitcoinPrice = async () => {
    try {
      // Try multiple APIs for better reliability
      const apis = [
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        'https://api.coindesk.com/v1/bpi/currentprice.json',
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
      ];
      
      for (const api of apis) {
        try {
          const response = await fetch(api);
          const data = await response.json();
          
          let bitcoinPrice = 0;
          if (api.includes('coingecko')) {
            bitcoinPrice = data.bitcoin.usd;
          } else if (api.includes('coindesk')) {
            bitcoinPrice = data.bpi.USD.rate_float;
          } else if (api.includes('binance')) {
            bitcoinPrice = parseFloat(data.price);
          }
          
          if (bitcoinPrice > 0) {
            setExchangeRates(prev => ({ ...prev, bitcoinToUsd: bitcoinPrice }));
            return; // Success, exit the loop
          }
        } catch (apiError) {
          console.warn(`Failed to fetch from ${api}:`, apiError);
          continue; // Try next API
        }
      }
      
      // If all APIs fail, use a reasonable default
      console.warn('All Bitcoin APIs failed, using default price');
      setExchangeRates(prev => ({ ...prev, bitcoinToUsd: FALLBACK_BITCOIN_PRICE }));
    } catch (error) {
      console.error('Failed to fetch Bitcoin price:', error);
      setExchangeRates(prev => ({ ...prev, bitcoinToUsd: FALLBACK_BITCOIN_PRICE }));
    }
  };

    const loadAssets = async () => {
      try {
        const [companyData, personalData] = await Promise.all([
          ClientAPI.getCompanyAssets(),
          ClientAPI.getPersonalAssets()
        ]);
        setCompanyAssets(companyData);
        setPersonalAssets(personalData);
        setIsHydrated(true);
      } catch (error) {
        console.error('Failed to load assets:', error);
      }
    };

    const handleAssetsUpdate = async () => {
      try {
        const [companyData, personalData] = await Promise.all([
          ClientAPI.getCompanyAssets(),
          ClientAPI.getPersonalAssets()
        ]);
        setCompanyAssets(companyData);
        setPersonalAssets(personalData);
      } catch (error) {
        console.error('Failed to update assets:', error);
      }
    };

    const handleItemsUpdate = async () => {
      try {
        const companyData = await ClientAPI.getCompanyAssets();
        setCompanyAssets(companyData);
      } catch (error) {
        console.error('Failed to update company assets:', error);
      }
    };

  // Load assets from data store and mark as hydrated
  useEffect(() => {
    loadAssets();
    fetchBitcoinPrice();

    window.addEventListener('assetsUpdated', handleAssetsUpdate);
    window.addEventListener('itemsUpdated', handleItemsUpdate);
    window.addEventListener('financialsUpdated', handleAssetsUpdate); // ← NEW
    
    return () => {
      window.removeEventListener('assetsUpdated', handleAssetsUpdate);
      window.removeEventListener('itemsUpdated', handleItemsUpdate);
      window.removeEventListener('financialsUpdated', handleAssetsUpdate); // ← NEW
    };
  }, []);

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated || !companyAssets || !personalAssets) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finances</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = USD_CURRENCY) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };



  // Asset calculation helpers with currency conversion
  const getCompanyCoreMonetaryTotal = () => {
    if (!companyAssets) return 0;
    return getCoreMonetaryTotal(companyAssets, exchangeRates, false);
  };

  // Row-level T$ helpers (company)
  const getCompanyCashT = () => {
    if (!companyAssets) return 0;
    return getCashTotal(companyAssets.cash, companyAssets.cashColones, exchangeRates);
  };
  const getCompanyBankT = () => {
    if (!companyAssets) return 0;
    return getBankTotal(companyAssets.bank, companyAssets.bankColones, exchangeRates);
  };
  const getCompanyBitcoinT = () => {
    if (!companyAssets) return 0;
    return getBitcoinTotal(companyAssets.bitcoin, companyAssets.bitcoinSats, exchangeRates);
  };
  const getCompanyToChargeT = () => {
    if (!companyAssets) return 0;
    return getToChargeTotal(companyAssets.toCharge, companyAssets.toChargeColones, exchangeRates);
  };
  const getCompanyToPayT = () => {
    if (!companyAssets) return 0;
    return getToPayTotal(companyAssets.toPay, companyAssets.toPayColones, exchangeRates);
  };
  
  const getCompanyMonetaryTotal = () => {
    if (!companyAssets) return 0;
    return getMonetaryTotal(companyAssets, exchangeRates, false);
  };
  
  const getCompanyJ$Total = () => companyAssets?.companyJ$ || 0;
  
  const getCompanyInventoryTotal = () => {
    if (!companyAssets) return 0;
    return (companyAssets.materials?.value || 0) + (companyAssets.equipment?.value || 0) + 
           (companyAssets.artworks?.value || 0) + (companyAssets.prints?.value || 0) + 
           (companyAssets.stickers?.value || 0) + (companyAssets.merch?.value || 0);
  };
  
  const getCompanyInventoryCost = () => {
    if (!companyAssets) return 0;
    return (companyAssets.materials?.cost || 0) + (companyAssets.equipment?.cost || 0) + 
           (companyAssets.artworks?.cost || 0) + (companyAssets.prints?.cost || 0) + 
           (companyAssets.stickers?.cost || 0) + (companyAssets.merch?.cost || 0);
  };
  
  const getCompanyTotal = () => getCompanyMonetaryTotal() + getJungleCoinsTotal(getCompanyJ$Total(), exchangeRates) + getCompanyInventoryTotal();

  const getPersonalCoreMonetaryTotal = () => {
    if (!personalAssets) return 0;
    return getCoreMonetaryTotal(personalAssets, exchangeRates, true);
  };

  // Row-level T$ helpers (personal)
  const getPersonalCashT = () => {
    if (!personalAssets) return 0;
    return getCashTotal(personalAssets.cash, personalAssets.cashColones, exchangeRates);
  };
  const getPersonalBankT = () => {
    if (!personalAssets) return 0;
    return getBankTotal(personalAssets.bank, personalAssets.bankColones, exchangeRates);
  };
  const getPersonalBitcoinT = () => {
    if (!personalAssets) return 0;
    return getBitcoinTotal(personalAssets.bitcoin, personalAssets.bitcoinSats, exchangeRates);
  };
  const getPersonalCryptoT = () => {
    if (!personalAssets) return 0;
    return personalAssets.crypto || 0; // already USD
  };
  const getPersonalToChargeT = () => {
    if (!personalAssets) return 0;
    return getToChargeTotal(personalAssets.toCharge, personalAssets.toChargeColones, exchangeRates);
  };
  const getPersonalToPayT = () => {
    if (!personalAssets) return 0;
    return getToPayTotal(personalAssets.toPay, personalAssets.toPayColones, exchangeRates);
  };
  
  const getPersonalMonetaryTotal = () => {
    if (!personalAssets) return 0;
    return getMonetaryTotal(personalAssets, exchangeRates, true);
  };
  
  const getPersonalJ$Total = () => personalAssets?.personalJ$ || 0;
  
  const getPersonalOtherTotal = () => {
    if (!personalAssets) return 0;
    return getOtherAssetsTotal(personalAssets);
  };
  
  const getPersonalTotal = () => getPersonalMonetaryTotal() + getJungleCoinsTotal(getPersonalJ$Total(), exchangeRates) + getPersonalOtherTotal();

  const getTotalNetWorth = () => getCompanyTotal() + getPersonalTotal();

  // Section editing
  const handleEditSection = (type: 'company' | 'personal', section: 'monetary' | 'jungleCoins' | 'otherAssets') => {
    setEditingSection({ type, section });
  };

  const handleSaveSection = (sectionData: any) => {
    if (!editingSection) return;
    
    // Convert ToPay from positive input to negative for storage
    if (sectionData.toPay !== undefined) {
      sectionData.toPay = -Math.abs(sectionData.toPay);
    }
    
    if (editingSection.type === 'company') {
      const updatedAssets = { ...companyAssets, ...sectionData };
      setCompanyAssets(updatedAssets);
      ClientAPI.saveCompanyAssets(updatedAssets);
    } else {
      const updatedAssets = { ...personalAssets, ...sectionData };
      setPersonalAssets(updatedAssets);
      ClientAPI.savePersonalAssets(updatedAssets);
    }
    
    setEditingSection(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finances </h1>   
        </div>
        
        <div className="flex items-center gap-4">
        <MonthYearSelector
            currentYear={currentYear}
            currentMonth={currentMonth}
            onYearChange={setCurrentYear}
            onMonthChange={setCurrentMonth}
          />
          <Button 
            onClick={() => setShowFinancialsModal(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Fin. Record
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>

        {/* Assets Tab - Now First and Main */}
        <TabsContent value="assets" className="space-y-4">
          {/* Concise Cashflow Summary at Top */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Cashflow Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Cashflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue</span>
                  <span className="font-medium">{aggregatedFinancialData ? formatCurrency(aggregatedFinancialData.totalRevenue) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost</span>
                  <span className="font-medium">{aggregatedFinancialData ? formatCurrency(aggregatedFinancialData.totalCost) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net</span>
                  <span className={`font-bold ${
                    aggregatedFinancialData ? 
                      aggregatedFinancialData.net === 0 ? 'text-muted-foreground' : 
                      aggregatedFinancialData.net > 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-muted-foreground'
                  }`}>
                    {aggregatedFinancialData ? formatCurrency(aggregatedFinancialData.net) : '$0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>J$ Paid Out</span>
                  <span className="font-medium">{aggregatedFinancialData ? `-${aggregatedFinancialData.totalJungleCoins} J$ (${formatCurrency(aggregatedFinancialData.totalJungleCoins * exchangeRates.j$ToUSD)})` : '0 J$'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Personal Cashflow Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Cashflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue</span>
                  <span className="font-medium">{personalSummary ? formatCurrency(personalSummary.totalRevenue) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost</span>
                  <span className="font-medium">{personalSummary ? formatCurrency(personalSummary.totalCost) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net</span>
                  <span className={`font-bold ${
                    personalSummary ? 
                      personalSummary.netCashflow === 0 ? 'text-muted-foreground' : 
                      personalSummary.netCashflow > 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-muted-foreground'
                  }`}>
                    {personalSummary ? formatCurrency(personalSummary.netCashflow) : '$0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>J$ Received</span>
                  <span className="font-medium">{personalSummary ? `+${personalSummary.totalJungleCoins} J$ (${formatCurrency(personalSummary.totalJungleCoins * exchangeRates.j$ToUSD)})` : '0 J$'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Assets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Company Assets
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: T${getCompanyTotal().toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Monetary Assets Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Monetary Assets</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditSection('company', 'monetary')}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {/* Core Assets Section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Core Assets</div>
                      <div className="font-medium text-right">Value</div>
                      
                      <div>Cash</div>
                      <div className="text-right">T${formatDecimal(getCompanyCashT())}</div>
                      
                      <div>Bank</div>
                      <div className="text-right">T${formatDecimal(getCompanyBankT())}</div>
                      
                      <div>Bitcoin</div>
                      <div className="text-right">T${formatDecimal(getCompanyBitcoinT())}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">T${formatDecimal(getCompanyCoreMonetaryTotal())}</div>
                    </div>
                    
                    {/* Upcoming Section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Upcoming</div>
                      <div className="font-medium text-right">Value</div>
                      
                      <div>ToCharge</div>
                      <div className="text-right">T${formatDecimal(getCompanyToChargeT())}</div>
                      
                      <div>ToPay</div>  
                      <div className="text-right">T${formatDecimal(getCompanyToPayT())}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">T${formatDecimal(getCompanyMonetaryTotal())}</div>
                    </div>
                    
                    {/* Digital Assets Section */}
                    <div className="text-sm border rounded-lg p-3 bg-muted/30">
                    <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                        <div className="text-sm p-1 text-left">Digital Assets</div>
                        <div className="text-sm p-1 text-right">Amount (Q)</div>
                        <div className="text-sm p-1 text-right">Value ($)</div>
                        
                        <div>In-Game Currency (J$)</div>
                        <div className="text-right">{companyAssets.companyJ$} J$</div>
                        <div className="text-right">${((companyAssets.companyJ$ || 0) * exchangeRates.j$ToUSD).toLocaleString()}</div>
                        
                        <div className="text-muted-foreground opacity-60">Bitcoin Zaps (Z₿)</div>
                        <div className="text-right text-muted-foreground opacity-60">0 sats</div>
                        <div className="text-right text-muted-foreground opacity-60">$0</div>
                        
                        <div className="text-muted-foreground opacity-60">In-Game NFTs</div>
                        <div className="text-right text-muted-foreground opacity-60">0 NFTs</div>
                        <div className="text-right text-muted-foreground opacity-60">$0</div>
                        
                        <div className="font-semibold border-t pt-1">Total</div>
                        <div className="border-t pt-1"></div>
                        <div className="font-semibold text-right border-t pt-1">${((companyAssets.companyJ$ || 0) * exchangeRates.j$ToUSD).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Inventories Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm py-2">Inventories</h4>
                  </div>
                  <div className="space-y-3">
                    {/* Creative Items Section */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Creative Items</div>
                      <div className="font-medium text-right">Value</div>
                      <div className="font-medium text-right">Cost</div>
                      
                      <div>Artworks</div>
                      <div className="text-right">${companyAssets.artworks.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.artworks.cost.toLocaleString()}</div>
                      
                      <div>Prints</div>
                      <div className="text-right">${companyAssets.prints.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.prints.cost.toLocaleString()}</div>
                      
                      <div>Stickers</div>
                      <div className="text-right">${companyAssets.stickers.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.stickers.cost.toLocaleString()}</div>
                      
                      <div>Sticker Bundles</div>
                      <div className="text-right">$0</div>
                      <div className="text-right">$0</div>
                      
                      <div>Merch</div>
                      <div className="text-right">${companyAssets.merch.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.merch.cost.toLocaleString()}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">${(companyAssets.artworks.value + companyAssets.prints.value + companyAssets.stickers.value + companyAssets.merch.value).toLocaleString()}</div>
                      <div className="font-semibold text-right border-t pt-1">${(companyAssets.artworks.cost + companyAssets.prints.cost + companyAssets.stickers.cost + companyAssets.merch.cost).toLocaleString()}</div>
                    </div>
                    
                    {/* Materials & Equipment Section */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Operations Items </div>
                      <div className="font-medium text-right">Value</div>
                      <div className="font-medium text-right">Cost</div>
                      
                      <div>Materials</div>
                      <div className="text-right">${companyAssets.materials.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.materials.cost.toLocaleString()}</div>
                      
                      <div>Equipment</div>
                      <div className="text-right">${companyAssets.equipment.value.toLocaleString()}</div>
                      <div className="text-right">${companyAssets.equipment.cost.toLocaleString()}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">${(companyAssets.materials.value + companyAssets.equipment.value).toLocaleString()}</div>
                      <div className="font-semibold text-right border-t pt-1">${(companyAssets.materials.cost + companyAssets.equipment.cost).toLocaleString()}</div>
                    </div>
                    
                    {/* Overall Inventory Total */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Inventories Total</div>
                      <div className="font-medium text-right">Value</div>
                      <div className="font-medium text-right">Cost</div>
                      
                      <div className="font-semibold">Total</div>
                      <div className="font-semibold text-right">${getCompanyInventoryTotal().toLocaleString()}</div>
                      <div className="font-semibold text-right">${getCompanyInventoryCost().toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Assets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Personal Assets
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: T${getPersonalTotal().toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                {/* Monetary Assets Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Monetary Assets</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditSection('personal', 'monetary')}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {/* Core Assets Section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Core Assets</div>
                      <div className="font-medium text-right">Value</div>
                      
                      <div>Cash</div>
                      <div className="text-right">T${formatDecimal(getPersonalCashT())}</div>
                      
                      <div>Bank</div>
                      <div className="text-right">T${formatDecimal(getPersonalBankT())}</div>
                      
                      <div>Bitcoin</div>
                      <div className="text-right">T${formatDecimal(getPersonalBitcoinT())}</div>
                      
                      <div>Crypto</div>
                      <div className="text-right">T${formatDecimal(getPersonalCryptoT())}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">T${formatDecimal(getPersonalCoreMonetaryTotal())}</div>
                    </div>
                    
                    {/* Upcoming Section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Upcoming</div>
                      <div className="font-medium text-right">Value</div>
                      
                      <div>ToCharge</div>
                      <div className="text-right">T${formatDecimal(getPersonalToChargeT())}</div>
                      
                      <div>ToPay</div>
                      <div className="text-right">T${formatDecimal(getPersonalToPayT())}</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">T${formatDecimal(getPersonalMonetaryTotal())}</div>
                    </div>
                  </div>
                </div>

                {/* Character Rewards Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm py-2">Character Rewards</h4>
                  </div>
                  <div className="space-y-3">
                    {/* Points Not Collected Section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Points Not Collected</div>
                      <div className="font-medium text-right">Amount</div>
                      
                      <div>HP</div>
                      <div className="text-right">0</div>
                      
                      <div>FP</div>
                      <div className="text-right">0</div>
                      
                      <div>RP</div>
                      <div className="text-right">0</div>
                      
                      <div>XP</div>
                      <div className="text-right">0</div>
                      
                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">0</div>
                    </div>
                    
                    {/* Digital Assets Section */}
                    <div className="text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                        <div className="text-sm p-1 text-left">Digital Assets</div>
                        <div className="text-sm p-1 text-right">Amount (Q)</div>
                        <div className="text-sm p-1 text-right">Value ($)</div>
                        
                        <div>In-Game Currency (J$)</div>
                        <div className="text-right">{personalAssets.personalJ$} J$</div>
                        <div className="text-right">${((personalAssets.personalJ$ || VALIDATION_CONSTANTS.DEFAULT_NUMERIC_VALUE) * (exchangeRates.j$ToUSD || VALIDATION_CONSTANTS.DEFAULT_EXCHANGE_RATE)).toLocaleString()}</div>
                        
                        <div className="text-muted-foreground opacity-60">Bitcoin Zaps (Z₿)</div>
                        <div className="text-right text-muted-foreground opacity-60">0 sats</div>
                        <div className="text-right text-muted-foreground opacity-60">$0</div>
                        
                        <div className="text-muted-foreground opacity-60">In-Game NFTs</div>
                        <div className="text-right text-muted-foreground opacity-60">0 NFTs</div>
                        <div className="text-right text-muted-foreground opacity-60">$0</div>
                        
                        <div className="font-semibold border-t pt-1">Total</div>
                        <div className="border-t pt-1"></div>
                        <div className="font-semibold text-right border-t pt-1">${((personalAssets.personalJ$ || VALIDATION_CONSTANTS.DEFAULT_NUMERIC_VALUE) * (exchangeRates.j$ToUSD || VALIDATION_CONSTANTS.DEFAULT_EXCHANGE_RATE)).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Assets Column */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Other Assets</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditSection('personal', 'otherAssets')}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                    <div className="font-medium">Asset</div>
                    <div className="font-medium text-right">Value</div>
                    
                    <div>Vehicle</div>
                    <div className="text-right">${personalAssets?.vehicle?.toLocaleString() || '0'}</div>
                    
                    <div>Properties</div>
                    <div className="text-right">${personalAssets?.properties?.toLocaleString() || '0'}</div>
                    
                    <div>NFTs</div>
                    <div className="text-right">${personalAssets?.nfts?.toLocaleString() || '0'}</div>
                    
                    <div>Other</div>
                    <div className="text-right">${personalAssets?.other?.toLocaleString() || '0'}</div>
                    
                    <div className="font-semibold border-t pt-1">Total</div>
                    <div className="font-semibold text-right border-t pt-1">${getPersonalOtherTotal().toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exchange Rates Section at Bottom */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Exchange Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Exchange Rates:</span>
                  
                  <div className="flex items-center gap-1">
                    <span>₡</span>
                    <Input
                      type="number"
                      value={exchangeRates.colonesToUsd}
                      onChange={(e) => setExchangeRates(prev => ({ ...prev, colonesToUsd: parseFloat(e.target.value) || DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd }))}
                      className="w-16 h-6 text-xs"
                      min="1"
                    />
                    <span>= $1</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Bitcoin:</span>
                  <div className="flex items-center gap-1">
                    <span>$</span>
                    <Input
                      type="number"
                      value={exchangeRates.bitcoinToUsd}
                      onChange={(e) => setExchangeRates(prev => ({ ...prev, bitcoinToUsd: parseFloat(e.target.value) || FALLBACK_BITCOIN_PRICE }))}
                      className="w-20 h-6 text-xs"
                      min="1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchBitcoinPrice}
                      className="h-6 px-2 text-xs"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>J$:</span>
                  <div className="flex items-center gap-1">
                    <span>1 J$ = $</span>
                    <Input
                      type="number"
                      value={exchangeRates.j$ToUSD}
                      onChange={(e) => setExchangeRates(prev => ({ ...prev, j$ToUSD: parseFloat(e.target.value) || DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD }))}
                      className="w-16 h-6 text-xs"
                      min="1"
                    />
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConversionRatesModal(true)}
                  className="h-6 px-2 text-xs"
                >
                  Edit Conversion Rates
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Company Tab with nested tabs */}
        <TabsContent value="company" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Company</h2>
          </div>

          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="finances">Monthly Company Finances</TabsTrigger>
              <TabsTrigger value="records">Company Financial Records</TabsTrigger>
            </TabsList>

            {/* Company Finances Sub-tab */}
            <TabsContent value="finances" className="space-y-4">
              {/* Company Categories by Stations */}
              {['ADMIN', 'RESEARCH', 'DESIGN', 'PRODUCTION', 'SALES'].map(station => {
                const stationCategories = BUSINESS_STRUCTURE[station as keyof typeof BUSINESS_STRUCTURE];
                
                return (
                  <Card key={station}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{station} Station</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {stationCategories.map(category => {
              const breakdown = aggregatedCategoryData?.categoryBreakdown[category];
              const net = breakdown ? breakdown.net : 0;
               
              return (
                            <Card key={category} className="border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{category}</CardTitle>
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
                           <div>J$: {breakdown.jungleCoins} ({formatCurrency(breakdown.jungleCoins * exchangeRates.j$ToUSD)})</div>
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
         </TabsContent>

            {/* Company Financial Records Sub-tab */}
            <TabsContent value="records" className="space-y-4">
              <CompanyRecordsList 
                key={`company-${recordsRefreshKey}`}
                year={currentYear} 
                month={currentMonth} 
                onRecordUpdated={loadSummaries}
                onRecordEdit={(record) => {
                  // This is handled by CompanyRecordsList component
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

         {/* Personal Tab with nested tabs */}
         <TabsContent value="personal" className="space-y-4">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-semibold">Personal</h2>
           </div>

           <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="finances">Monthly Personal Finances</TabsTrigger>
               <TabsTrigger value="records">Personal Financial Records</TabsTrigger>
             </TabsList>

             {/* Personal Finances Sub-tab */}
             <TabsContent value="finances" className="space-y-4">
           {/* Personal Categories Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                 {getPersonalAreas().map(category => {
               const breakdown = aggregatedCategoryData?.categoryBreakdown[category];
               const net = breakdown ? breakdown.net : 0;
                
               return (
                 <Card key={category}>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm">{category}</CardTitle>
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
                            <div>J$: {breakdown.jungleCoins} ({formatCurrency(breakdown.jungleCoins * exchangeRates.j$ToUSD)})</div>
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
             </TabsContent>

             {/* Personal Financial Records Sub-tab */}
             <TabsContent value="records" className="space-y-4">
               <PersonalRecordsList 
                 key={`personal-${recordsRefreshKey}`}
                 year={currentYear} 
                 month={currentMonth} 
                 onRecordUpdated={loadSummaries}
                 onRecordEdit={(record) => {
                   // This is handled by PersonalRecordsList component
                 }}
               />
             </TabsContent>
           </Tabs>
          </TabsContent>
        </Tabs>


      {/* Asset Edit Modal */}
      {editingSection && (
        <AssetsEditModal
          isOpen={!!editingSection}
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={handleSaveSection}
          exchangeRates={exchangeRates}
          initialData={(() => {
            if (editingSection.type === 'company') {
              switch (editingSection.section) {
        case 'monetary':
          return {
            cash: companyAssets.cash,
            bank: companyAssets.bank,
            bitcoin: companyAssets.bitcoin,
            toCharge: companyAssets.toCharge,
                    toPay: Math.abs(companyAssets.toPay),
            cashColones: companyAssets.cashColones || 0,
            bankColones: companyAssets.bankColones || 0,
            toChargeColones: companyAssets.toChargeColones || 0,
            toPayColones: companyAssets.toPayColones || 0,
            bitcoinSats: companyAssets.bitcoinSats || 0
          };
        case 'jungleCoins':
          return { companyJ$: companyAssets.companyJ$ };
        case 'inventories':
          return {
            materials: { value: companyAssets.materials.value, cost: companyAssets.materials.cost },
            equipment: { value: companyAssets.equipment.value, cost: companyAssets.equipment.cost },
            artworks: { value: companyAssets.artworks.value, cost: companyAssets.artworks.cost },
            prints: { value: companyAssets.prints.value, cost: companyAssets.prints.cost },
            stickers: { value: companyAssets.stickers.value, cost: companyAssets.stickers.cost },
            merch: { value: companyAssets.merch.value, cost: companyAssets.merch.cost }
          };
        default:
          return {};
      }
    } else {
              switch (editingSection.section) {
        case 'monetary':
          return {
            cash: personalAssets.cash,
            bank: personalAssets.bank,
            bitcoin: personalAssets.bitcoin,
            crypto: personalAssets.crypto,
            toCharge: personalAssets.toCharge,
                    toPay: Math.abs(personalAssets.toPay),
            cashColones: personalAssets.cashColones || 0,
            bankColones: personalAssets.bankColones || 0,
            toChargeColones: personalAssets.toChargeColones || 0,
            toPayColones: personalAssets.toPayColones || 0,
            bitcoinSats: personalAssets.bitcoinSats || 0
          };
        case 'jungleCoins':
          return { personalJ$: personalAssets.personalJ$ };
        case 'otherAssets':
          return {
            vehicle: personalAssets.vehicle,
            properties: personalAssets.properties,
            nfts: personalAssets.nfts,
            other: personalAssets.other
          };
        default:
          return {};
      }
    }
          })()}
        />
      )}

      {/* Conversion Rates Modal */}
      {showConversionRatesModal && (
        <ConversionRatesModal
          isOpen={showConversionRatesModal}
          onClose={() => setShowConversionRatesModal(false)}
          initialRates={{
            ...pointsConversionRates,
            colonesToUsd: exchangeRates.colonesToUsd,
            bitcoinToUsd: exchangeRates.bitcoinToUsd,
            j$ToUSD: exchangeRates.j$ToUSD
          }}
          onSave={(rates) => {
            ClientAPI.saveConversionRates(rates);
            setPointsConversionRates(rates);
            setExchangeRates(rates);
            setShowConversionRatesModal(false);
            // Force re-render to show updated rates
            window.dispatchEvent(new Event('pointsUpdated'));
          }}
        />
      )}

      {/* Record Modal */}
      <FinancialsModal
        record={null}
        year={currentYear}
        month={currentMonth}
        open={showFinancialsModal}
        onOpenChange={setShowFinancialsModal}
        onSave={async (record: FinancialRecord) => {
          try {
            // Parent only calls DataStore - Links System handles all relationships automatically
            const finalRecord = await ClientAPI.upsertFinancialRecord(record);
            
            // Refresh summaries
            await loadSummaries();
            
            // Close modal
            setShowFinancialsModal(false);
          } catch (error) {
            console.error('Failed to save financial record:', error);
          }
        }}
      />

    </div>
  );
}

// Helper functions for SearchableSelect options
const getCompanyCategoryOptions = () => {
  const options: Array<{ value: string; label: string; group: string }> = [];
  
  Object.entries(BUSINESS_STRUCTURE).forEach(([station, categories]) => {
    if (station !== 'PERSONAL') {
      categories.forEach((category) => {
        options.push({
          value: category,
          label: category,
          group: station
        });
      });
    }
  });
  
  return options;
};

const getPersonalCategoryOptions = () => {
  const options: Array<{ value: string; label: string; group: string }> = [];
  
  BUSINESS_STRUCTURE['PERSONAL'].forEach((category) => {
    options.push({
      value: category,
      label: category,
      group: 'PERSONAL'
    });
  });
  
  return options;
};
