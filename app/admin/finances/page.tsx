'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { ClientAPI } from '@/lib/client-api';
import { getZIndexClass, getModalZIndex } from '@/lib/utils/z-index-utils';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import {
  FinancialRecord,
  CompanyFinancialCategory,
  PersonalFinancialCategory,
  CompanyMonthlySummary,
  PersonalMonthlySummary,
  Item,
} from '@/types/entities';
import { Plus, DollarSign, TrendingUp, TrendingDown, Building2, User } from 'lucide-react';
import { MONTHS, getYearRange, getMonthName, getCurrentMonth } from '@/lib/constants/date-constants';
import { BUSINESS_STRUCTURE, ItemType, PLAYER_ONE_ID } from '@/types/enums';
import { getCompanyAreas, getPersonalAreas, isCompanyStation, getAreaForStation } from '@/lib/utils/business-structure-utils';
import { CompanyRecordsList, PersonalRecordsList } from '@/components/finances/financial-records-components';
import { MonthlyHistoricalCashflows } from '@/components/finances/monthly-historical-cashflows';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import {
  aggregateRecordsByStation,
  calculateTotals,
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
  type ExchangeRates,
  type MonetaryAssets,
  type InventoryAssets,
  type OtherAssets
} from '@/lib/utils/financial-utils';
import { PRICE_STEP, DECIMAL_STEP, J$_TO_USD_RATE, PRIMARY_CURRENCY, USD_CURRENCY } from '@/lib/constants/app-constants';
import { VALIDATION_CONSTANTS } from '@/lib/constants/financial-constants';
// formatMonthYear will be implemented inline
import { MonthYearSelector } from '@/components/ui/month-year-selector'
import AssetsEditModal from '@/components/modals/submodals/assets-edit-submodal'
import ConversionRatesModal from '@/components/modals/submodals/conversion-rates-submodal'
import FinancialsModal from '@/components/modals/financials-modal'

import { PartnershipsManager } from '@/components/finances/partnerships-manager';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { Contract, Business, Character, Site } from '@/types/entities';
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

type InventoryBucketTotals = Record<
  'materials' | 'equipment' | 'artworks' | 'prints' | 'stickers' | 'merch' | 'crafts',
  { value: number; cost: number }
>;

const EMPTY_INVENTORY_TOTALS: InventoryBucketTotals = {
  materials: { value: 0, cost: 0 },
  equipment: { value: 0, cost: 0 },
  artworks: { value: 0, cost: 0 },
  prints: { value: 0, cost: 0 },
  stickers: { value: 0, cost: 0 },
  merch: { value: 0, cost: 0 },
  crafts: { value: 0, cost: 0 },
};

const ITEM_TYPE_TO_BUCKET: Partial<Record<ItemType, keyof InventoryBucketTotals>> = {
  [ItemType.MATERIAL]: 'materials',
  [ItemType.EQUIPMENT]: 'equipment',
  [ItemType.ARTWORK]: 'artworks',
  [ItemType.PRINT]: 'prints',
  [ItemType.STICKER]: 'stickers',
  [ItemType.MERCH]: 'merch',
  [ItemType.CRAFT]: 'crafts',
  [ItemType.DIGITAL]: 'artworks',
  [ItemType.BUNDLE]: 'stickers',
};

function calculateInventoryTotalsFromItems(items: Item[]): InventoryBucketTotals {
  const totals: InventoryBucketTotals = JSON.parse(JSON.stringify(EMPTY_INVENTORY_TOTALS));

  items.forEach((item) => {
    const bucketKey = ITEM_TYPE_TO_BUCKET[item.type as ItemType];
    if (!bucketKey) return;

    const quantity = (item.stock || []).reduce((sum, stockPoint) => sum + (Number(stockPoint.quantity) || 0), 0);
    if (quantity <= 0) return;

    const pricePerUnit = Number(item.price ?? item.value ?? 0);
    const costPerUnit = Number(item.unitCost ?? 0) + Number(item.additionalCost ?? 0);

    totals[bucketKey].value += pricePerUnit * quantity;
    totals[bucketKey].cost += costPerUnit * quantity;
  });

  return totals;
}

function mergeInventoryTotalsIntoAssets(assets: any, inventoryTotals: InventoryBucketTotals) {
  if (!assets) return assets;
  return {
    ...assets,
    materials: inventoryTotals.materials,
    equipment: inventoryTotals.equipment,
    artworks: inventoryTotals.artworks,
    prints: inventoryTotals.prints,
    stickers: inventoryTotals.stickers,
    merch: inventoryTotals.merch,
    crafts: inventoryTotals.crafts,
  };
}

export default function FinancesPage() {
  const { getPreference, setPreference, isLoading: preferencesLoading } = useUserPreferences();
  const [filterByMonth, setFilterByMonth] = useState(true); // Default to true, will sync from preferences
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

  const [isHydrated, setIsHydrated] = useState(false);

  // Asset state management - now using data store
  const [companyAssets, setCompanyAssets] = useState<any>(null);
  const [personalAssets, setPersonalAssets] = useState<any>(null);
  const [jungleCoinsBalance, setJungleCoinsBalance] = useState<number>(0);
  const [treasuryData, setTreasuryData] = useState<any>(null);

  // Currency conversion state
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRates>(DEFAULT_CURRENCY_EXCHANGE_RATES);
  const [pointsConversionRates, setPointsConversionRates] = useState<PointsConversionRates>(DEFAULT_POINTS_CONVERSION_RATES);
  const [isFetchingBitcoin, setIsFetchingBitcoin] = useState(false);

  const [editingSection, setEditingSection] = useState<{
    type: 'company' | 'personal';
    section: 'monetary' | 'jungleCoins' | 'inventories' | 'otherAssets';
  } | null>(null);

  // Partnership State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Load saved filter preference once preferences are loaded
  useEffect(() => {
    if (!preferencesLoading) {
      const savedFilter = getPreference('finances-filter-by-month', true);
      setFilterByMonth(savedFilter);
    }
  }, [preferencesLoading, getPreference]);

  // Handle filter toggle
  const handleFilterToggle = (checked: boolean) => {
    setFilterByMonth(checked);
    setPreference('finances-filter-by-month', checked);
  };

  // Load conversion rates
  useEffect(() => {
    const loadConversionRates = async () => {
      try {
        const rates = await ClientAPI.getFinancialConversionRates();
        setPointsConversionRates(rates);
        setExchangeRates(rates);
      } catch (error) {
        console.error('Failed to load conversion rates:', error);
      }
    };

    loadConversionRates();
  }, []);

  const loadSummaries = useCallback(async () => {
    const records = await ClientAPI.getFinancialRecords(
      filterByMonth ? currentMonth : undefined,
      filterByMonth ? currentYear : undefined
    );
    const companyRecords = records.filter(r => r.type === 'company');
    const personalRecords = records.filter(r => r.type === 'personal');

    // Aggregate company records by station using DRY utility
    const companyStations = getCompanyAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
    const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
    const companyTotals = calculateTotals(companyBreakdown);

    // Aggregate personal records by station using DRY utility
    const personalStations = BUSINESS_STRUCTURE.PERSONAL;
    const personalBreakdown = aggregateRecordsByStation(personalRecords, personalStations);
    const personalTotals = calculateTotals(personalBreakdown);

    // Create summaries with REAL aggregated data
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
    setAggregatedFinancialData(companyTotals);
    setAggregatedCategoryData({ categoryBreakdown: companyBreakdown });
    setRecordsRefreshKey(prev => prev + 1);
  }, [currentYear, currentMonth, filterByMonth]);

  // Load summaries for current month
  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);


  const fetchBitcoinPrice = async () => {
    setIsFetchingBitcoin(true);
    try {
      const response = await fetch('/api/bitcoin/price', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed request: ${response.status}`);
      }
      const data = await response.json();
      if (data?.price && data.price > 0) {
        setExchangeRates(prev => ({ ...prev, bitcoinToUsd: data.price }));
        setIsFetchingBitcoin(false);
        return;
      }
      throw new Error('Invalid price payload');
    } catch (error) {
      console.error('Failed to fetch Bitcoin price:', error);
      setExchangeRates(prev => ({ ...prev, bitcoinToUsd: FALLBACK_BITCOIN_PRICE }));
    } finally {
      setIsFetchingBitcoin(false);
    }
  };

  const loadAssets = async () => {
    try {
      const [companyData, personalData] = await Promise.all([
        ClientAPI.getCompanyAssets(),
        ClientAPI.getPersonalAssets(),
      ]);

      let mergedCompanyData = companyData;
      try {
        const items = await ClientAPI.getItems();
        const inventoryTotals = calculateInventoryTotalsFromItems(items);
        mergedCompanyData = mergeInventoryTotalsIntoAssets(companyData, inventoryTotals);
      } catch (inventoryError) {
        console.warn('Failed to compute inventory totals from items:', inventoryError);
      }

      setCompanyAssets(mergedCompanyData);
      setPersonalAssets(personalData);

      // Get current user's player ID from session (multiplayer-ready)
      let currentPlayerId: string | null = null;
      try {
        const authResponse = await fetch('/api/auth/check');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.authenticated && authData.user?.sub) {
            // Check if sub is a valid UUID (account ID) before calling getAccount
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authData.user.sub);
            if (isUUID) {
              // Get account from session (sub is account ID)
              const account = await ClientAPI.getAccount(authData.user.sub);
              if (account?.playerId) {
                currentPlayerId = account.playerId;
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to get current user from session:', error);
      }

      // Fallback to PLAYER_ONE_ID if no session player found (for development/single-user)
      if (!currentPlayerId) {
        const players = await ClientAPI.getPlayers().catch(() => []);
        currentPlayerId = players.find((p: any) => p.id === PLAYER_ONE_ID)?.id || players[0]?.id || null;
      }

      // Fetch J$ balance for current user's player only
      if (currentPlayerId) {
        try {
          const j$BalanceData = await ClientAPI.getPlayerJungleCoinsBalance(currentPlayerId);
          setJungleCoinsBalance(j$BalanceData?.totalJ$ ?? 0);
        } catch (error) {
          console.error('Failed to fetch J$ balance:', error);
          setJungleCoinsBalance(0);
        }
      } else {
        setJungleCoinsBalance(0);
      }

      // Load treasury data
      try {
        const treasury = await ClientAPI.getCompanyJ$Treasury();
        setTreasuryData(treasury);
      } catch (error) {
        console.error('Failed to fetch treasury data:', error);
        setTreasuryData(null);
      }

      setIsHydrated(true);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }

  };

  const loadPartnershipData = async () => {
    try {
      const [loadedContracts, loadedEntities, loadedCharacters, loadedSites] = await Promise.all([
        ClientAPI.getContracts(),
        ClientAPI.getBusinesses(),
        ClientAPI.getCharacters(),
        ClientAPI.getSites()
      ]);
      setContracts(loadedContracts);
      setBusinesses(loadedEntities);
      setCharacters(loadedCharacters);
      setSites(loadedSites);
    } catch (error) {
      console.error('Failed to load partnership data:', error);
    }
  };

  const handleCreateBusiness = async (entity: Business) => {
    try {
      await ClientAPI.upsertBusiness(entity);
      loadPartnershipData();
    } catch (error) {
      console.error('Failed to create business', error);
    }
  };

  const handleUpdateBusiness = async (entity: Business) => {
    try {
      await ClientAPI.upsertBusiness(entity);
      loadPartnershipData();
    } catch (error) {
      console.error('Failed to update legal entity', error);
    }
  };

  const handleCreateContract = async (contract: Contract) => {
    try {
      await ClientAPI.upsertContract(contract);
      loadPartnershipData();
    } catch (error) {
      console.error('Failed to create contract', error);
    }
  };

  const handleUpdateContract = async (contract: Contract) => {
    try {
      await ClientAPI.upsertContract(contract);
      loadPartnershipData();
    } catch (error) {
      console.error('Failed to update contract', error);
    }
  };

  const handleAssetsUpdate = async () => {
    try {
      const [companyData, personalData] = await Promise.all([
        ClientAPI.getCompanyAssets(),
        ClientAPI.getPersonalAssets(),
      ]);

      let mergedCompanyData = companyData;
      try {
        const items = await ClientAPI.getItems();
        const inventoryTotals = calculateInventoryTotalsFromItems(items);
        mergedCompanyData = mergeInventoryTotalsIntoAssets(companyData, inventoryTotals);
      } catch (inventoryError) {
        console.warn('Failed to recompute inventory totals from items:', inventoryError);
      }

      setCompanyAssets(mergedCompanyData);
      setPersonalAssets(personalData);
    } catch (error) {
      console.error('Failed to update assets:', error);
    }
  };

  const handleItemsUpdate = async () => {
    try {
      const [companyData, items] = await Promise.all([
        ClientAPI.getCompanyAssets(),
        ClientAPI.getItems(),
      ]);
      const inventoryTotals = calculateInventoryTotalsFromItems(items);
      const mergedCompanyData = mergeInventoryTotalsIntoAssets(companyData, inventoryTotals);
      setCompanyAssets(mergedCompanyData);
    } catch (error) {
      console.error('Failed to update company inventory totals:', error);
    }
  };

  // Listen for financials updates to refresh summaries
  useEntityUpdates('financial', () => setRefreshKey(prev => prev + 1));

  // Listen for items updates to refresh assets
  useEntityUpdates('item', handleItemsUpdate);

  // Load assets from data store and mark as hydrated
  // Load assets from data store and mark as hydrated
  useEffect(() => {
    loadAssets();
    loadPartnershipData();
    fetchBitcoinPrice();

    window.addEventListener('assetsUpdated', handleAssetsUpdate);

    return () => {
      window.removeEventListener('assetsUpdated', handleAssetsUpdate);
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
      (companyAssets.stickers?.value || 0) + (companyAssets.merch?.value || 0) + (companyAssets.crafts?.value || 0);
  };

  const getCompanyInventoryCost = () => {
    if (!companyAssets) return 0;
    return (companyAssets.materials?.cost || 0) + (companyAssets.equipment?.cost || 0) +
      (companyAssets.artworks?.cost || 0) + (companyAssets.prints?.cost || 0) +
      (companyAssets.stickers?.cost || 0) + (companyAssets.merch?.cost || 0) + (companyAssets.crafts?.cost || 0);
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

  const getPersonalJ$Total = () => jungleCoinsBalance;

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
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
            <Switch
              checked={filterByMonth}
              onCheckedChange={handleFilterToggle}
            />
            <span className="text-sm text-muted-foreground">Filter by month</span>
          </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
        </TabsList>

        {/* Assets Tab - Now First and Main */}
        <TabsContent value="partnerships" className="space-y-4">
          <PartnershipsManager
            businesses={businesses}
            contracts={contracts}
            characters={characters}
            sites={sites}
            onCreateContract={handleCreateContract}
            onUpdateContract={handleUpdateContract}
          />
        </TabsContent>

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
                  <span className="font-medium">{aggregatedFinancialData?.totalRevenue ? formatCurrency(aggregatedFinancialData.totalRevenue) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost</span>
                  <span className="font-medium">{aggregatedFinancialData?.totalCost ? formatCurrency(aggregatedFinancialData.totalCost) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net</span>
                  <span className={`font-bold ${aggregatedFinancialData?.net === 0 ? 'text-muted-foreground' :
                    aggregatedFinancialData?.net > 0 ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                    {aggregatedFinancialData?.net ? formatCurrency(aggregatedFinancialData.net) : '$0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>J$ Paid Out</span>
                  <span className="font-medium">{aggregatedFinancialData?.totalJungleCoins ? `-${aggregatedFinancialData.totalJungleCoins} J$ (${formatCurrency(aggregatedFinancialData.totalJungleCoins * exchangeRates.j$ToUSD)})` : '0 J$'}</span>
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
                  <span className="font-medium">{personalSummary?.totalRevenue ? formatCurrency(personalSummary.totalRevenue) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost</span>
                  <span className="font-medium">{personalSummary?.totalCost ? formatCurrency(personalSummary.totalCost) : '$0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net</span>
                  <span className={`font-bold ${personalSummary?.netCashflow === 0 ? 'text-muted-foreground' :
                    (personalSummary?.netCashflow ?? 0) > 0 ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                    {personalSummary?.netCashflow ? formatCurrency(personalSummary.netCashflow) : '$0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>J$ Received</span>
                  <span className="font-medium">{personalSummary?.totalJungleCoins ? `+${personalSummary.totalJungleCoins} J$ (${formatCurrency(personalSummary.totalJungleCoins * exchangeRates.j$ToUSD)})` : '0 J$'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Historical Cashflows */}
          <MonthlyHistoricalCashflows year={currentYear} month={currentMonth} />

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

                    {/* Company J$ Treasury Section */}
                    {treasuryData && (
                      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-foreground/70" />
                            Company J$ Treasury
                          </CardTitle>
                          <CardDescription className="text-xs">
                            J$ bought back from players
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Total J$ Bought Back</div>
                              <div className="text-xl font-semibold text-foreground">
                                {treasuryData.totalJ$BoughtBack.toFixed(2)} J$
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Total USD Spent</div>
                              <div className="text-xl font-semibold text-foreground">
                                ${treasuryData.totalUSDCost.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {treasuryData.buybackCount} buyback transaction{treasuryData.buybackCount !== 1 ? 's' : ''}
                          </div>

                          {/* Buyback History */}
                          {treasuryData.buybacks && treasuryData.buybacks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <h5 className="font-medium text-sm mb-3 text-foreground/80">Buyback History</h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {treasuryData.buybacks.map((buyback: any) => (
                                  <div key={buyback.id} className="text-xs border border-border/30 rounded-md p-2.5 bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                      <div className="font-medium text-foreground/90">{new Date(buyback.date).toLocaleDateString()}</div>
                                      <div className="text-right">
                                        <div className="font-semibold text-foreground">{buyback.j$BoughtBack.toFixed(2)} J$</div>
                                        {buyback.cashOutType === 'USD' ? (
                                          <div className="text-muted-foreground text-xs">${buyback.usdCost.toFixed(2)}</div>
                                        ) : (
                                          <div className="text-muted-foreground text-xs">{buyback.zapsCost?.toFixed(0) || 0} sats</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground text-xs mt-1">
                                      <span>{buyback.station} • {buyback.cashOutType}</span>
                                      <span>{buyback.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
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

                      <div>Crafts</div>
                      <div className="text-right">${(companyAssets.crafts?.value || 0).toLocaleString()}</div>
                      <div className="text-right">${(companyAssets.crafts?.cost || 0).toLocaleString()}</div>

                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="font-semibold text-right border-t pt-1">${((companyAssets.materials.value + companyAssets.equipment.value) + (companyAssets.crafts?.value || 0)).toLocaleString()}</div>
                      <div className="font-semibold text-right border-t pt-1">${((companyAssets.materials.cost + companyAssets.equipment.cost) + (companyAssets.crafts?.cost || 0)).toLocaleString()}</div>
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
              <div className="grid grid-cols-2 gap-6">
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

                    {/* Digital Assets Section */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium">Digital Assets</div>
                      <div className="font-medium text-right">Amount (Q)</div>
                      <div className="font-medium text-right">Value ($)</div>

                      <div>In-Game Currency (J$)</div>
                      <div className="text-right">{jungleCoinsBalance.toFixed(1)} J$</div>
                      <div className="text-right">${((jungleCoinsBalance || VALIDATION_CONSTANTS.DEFAULT_NUMERIC_VALUE) * (exchangeRates.j$ToUSD || VALIDATION_CONSTANTS.DEFAULT_EXCHANGE_RATE)).toLocaleString()}</div>

                      <div className="text-muted-foreground opacity-60">Bitcoin Zaps (Z₿)</div>
                      <div className="text-right text-muted-foreground opacity-60">0 sats</div>
                      <div className="text-right text-muted-foreground opacity-60">$0</div>

                      <div className="text-muted-foreground opacity-60">In-Game NFTs</div>
                      <div className="text-right text-muted-foreground opacity-60">0 NFTs</div>
                      <div className="text-right text-muted-foreground opacity-60">$0</div>

                      <div className="font-semibold border-t pt-1">Total</div>
                      <div className="border-t pt-1"></div>
                      <div className="font-semibold text-right border-t pt-1">${((jungleCoinsBalance || VALIDATION_CONSTANTS.DEFAULT_NUMERIC_VALUE) * (exchangeRates.j$ToUSD || VALIDATION_CONSTANTS.DEFAULT_EXCHANGE_RATE)).toLocaleString()}</div>
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
                    <NumericInput
                      value={exchangeRates.colonesToUsd}
                      onChange={(value) => setExchangeRates(prev => ({ ...prev, colonesToUsd: value || DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd }))}
                      className="w-16 h-6 text-xs"
                      min={1}
                    />
                    <span>= $1</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span>Bitcoin:</span>
                  <div className="flex items-center gap-1">
                    <span>$</span>
                    <NumericInput
                      value={exchangeRates.bitcoinToUsd}
                      onChange={(value) => setExchangeRates(prev => ({ ...prev, bitcoinToUsd: value || FALLBACK_BITCOIN_PRICE }))}
                      className="w-20 h-6 text-xs"
                      min={1}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchBitcoinPrice}
                      disabled={isFetchingBitcoin}
                      className="h-6 px-2 text-xs"
                    >
                      {isFetchingBitcoin ? '...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span>J$:</span>
                  <div className="flex items-center gap-1">
                    <span>1 J$ = $</span>
                    <NumericInput
                      value={exchangeRates.j$ToUSD}
                      onChange={(value) => setExchangeRates(prev => ({ ...prev, j$ToUSD: value || DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD }))}
                      className="w-16 h-6 text-xs"
                      min={1}
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

        {/* Company Tab - Records Only */}
        <TabsContent value="company" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Company Financial Records</h2>
          </div>
          <CompanyRecordsList
            key={`company-${recordsRefreshKey}`}
            year={filterByMonth ? currentYear : 0}
            month={filterByMonth ? currentMonth : 0}
            onRecordUpdated={loadSummaries}
            onRecordEdit={(record) => {
              // This is handled by CompanyRecordsList component
            }}
          />
        </TabsContent>

        {/* Personal Tab - Records Only */}
        <TabsContent value="personal" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Personal Financial Records</h2>
          </div>
          <PersonalRecordsList
            key={`personal-${recordsRefreshKey}`}
            year={filterByMonth ? currentYear : 0}
            month={filterByMonth ? currentMonth : 0}
            onRecordUpdated={loadSummaries}
            onRecordEdit={(record) => {
              // This is handled by PersonalRecordsList component
            }}
          />
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
                    merch: { value: companyAssets.merch.value, cost: companyAssets.merch.cost },
                    crafts: { value: companyAssets.crafts.value, cost: companyAssets.crafts.cost }
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
            ClientAPI.saveFinancialConversionRates(rates);
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
