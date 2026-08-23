"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumericInput from "@/components/ui/numeric-input";
import { extractMoneyValue, toMoney } from "@/lib/utils/financial-utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  User,
  Store,
  DollarSign,
  Network,
  CalendarIcon,
} from "lucide-react";
import {
  ItemType,
  Station,
  ContractStatus,
  ContractClauseType,
  SaleType,
  SaleStatus,
  CharacterRole,
  PaymentMethod,
  EntityType,
  LinkType,
} from "@/types/enums";
import { SalesStation } from "@/lib/storage/taxonomy";
import {
  Sale,
  SaleLine,
  Item,
  Site,
  Character,
  ServiceLine,
  ItemSaleLine,
  Business,
  Contract,
  BoothSaleContextV1,
} from "@/types/entities";
import { v4 as uuid } from "uuid";
import { createSiteOptionsWithCategories } from "@/lib/utils/site-options-utils";
import { formatForDisplay } from '@/lib/utils/date-display-utils';;
import { buildAutoSaleName } from "@/lib/utils/sale-auto-name-utils";
import SaleItemsSubModal from "./submodals/sale-items-submodal";
import ConfirmationModal from "./submodals/confirmation-submodal";
import { ClientAPI } from "@/lib/client-api";

// ============================================================================
// Types
// ============================================================================

export interface BoothSalesViewProps {
  // Data
  sites: Site[];
  characters: Character[];
  items: Item[];
  businesses: Business[]; // New: For resolving contracts
  contracts: Contract[]; // New: For dynamic distribution logic

  sale?: Sale | null;
  // State from Parent (SalesModal)
  saleDate: Date;
  setSaleDate: (date: Date) => void;
  lines: SaleLine[];
  setLines: (lines: SaleLine[]) => void;
  siteId: string;
  setSiteId: (id: string) => void;

  // Lifecycle Dates
  doneAt?: Date;
  collectedAt?: Date;

  // Actions
  onSave: (sale?: Sale) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;

  // Status State
  status: SaleStatus;
  setStatus: (status: SaleStatus) => void;

  // Financial
  exchangeRate?: number;
}

function getBoothContext(sale?: Sale | null): BoothSaleContextV1 & { boothCost?: number } {
  return sale?.context?.boothSaleContext || { boothCost: 0 };
}

function getSaleAmount(value: unknown): number {
  if (value && typeof value === "object" && "minorUnits" in value) {
    return extractMoneyValue(value as any);
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getInitialBoothCostCRC(sale: Sale | null | undefined, exchangeRate: number): number {
  const canonicalCost = sale?.context?.boothCost;
  if (canonicalCost !== undefined) return extractMoneyValue(canonicalCost) * exchangeRate;

  const legacyContext = sale?.context as (Sale['context'] & { boothFee?: unknown }) | undefined;
  return getSaleAmount(legacyContext?.boothFee ?? getBoothContext(sale).boothCost);
}

function getInitialPaymentInput(
  sale: Sale | null | undefined,
  method: PaymentMethod,
  exchangeRate: number,
  legacyValue: unknown,
): number {
  const canonicalPayment = sale?.payments?.find((payment) => payment.method === method);
  if (canonicalPayment) {
    const amountUSD = extractMoneyValue(canonicalPayment.amount);
    return method === PaymentMethod.FIAT_USD ? amountUSD : amountUSD * exchangeRate;
  }
  const legacyAmount = getSaleAmount(legacyValue);
  const legacyCurrency =
    legacyValue && typeof legacyValue === "object" && "currency" in legacyValue
      ? String((legacyValue as { currency?: unknown }).currency || "")
      : "";
  return method !== PaymentMethod.FIAT_USD && legacyCurrency === "USD"
    ? legacyAmount * exchangeRate
    : legacyAmount;
}

function getLegacyPaymentBreakdown(sale: Sale | null | undefined): Record<string, unknown> | undefined {
  return (sale?.context as (Sale['context'] & { paymentBreakdown?: Record<string, unknown> }) | undefined)
    ?.paymentBreakdown;
}

/** Parent DialogFooter calls this so booth saves use fullSale (metadata, payments, partner context). */
export type BoothSalesViewHandle = {
  submitBoothSave: () => void;
};

interface PartnerQuickEntry {
  id: string;
  description: string;
  amountCRC: number;
  amountUSD: number;
  category: string; // e.g., 'O2 Jewelry'
  partnerId: string; // Linking to specific partner
}

type SettlementRow = {
  id: string; // category name or item id
  label: string;
  isPartner: boolean;
  totalColones: number;
  totalDollars: number;
  totalBitcoin: number;
  totalCard: number; // pending
  // Calculated commissions
  commissionAmount: number; // 25% of converted total (or configurable)
  ownerAmount: number; // 75% of converted total (or configurable)
};

// ============================================================================
// Component Booth-Sales
// ============================================================================

const BoothSalesView = forwardRef<BoothSalesViewHandle, BoothSalesViewProps>(
  function BoothSalesView(
    {
      sites,
      characters,
      items,
      businesses,
      contracts,
      sale,
      saleDate,
      setSaleDate,
      lines,
      setLines,
      siteId,
      setSiteId,
      doneAt,
      collectedAt,
      onSave,
      onCancel,
      isSaving,
      status,
      setStatus,
      onDelete,
      exchangeRate = 500, // Deep fallback if network fails
    },
    ref,
  ) {
    // 1. Local State
    // ============================================================================

    // UI Toggles
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [businessCharacterIds, setBusinessCharacterIds] = useState<Record<string, string>>({});
    const [contractCharacterIds, setContractCharacterIds] = useState<Record<string, { owner?: string; counterparty?: string }>>({});

    useEffect(() => {
      let cancelled = false;
      Promise.all(businesses.map(async (business) => {
        const links = await ClientAPI.getLinksFor({ type: EntityType.BUSINESS, id: business.id });
        const owner = links.find((link: any) =>
          link.linkType === LinkType.CHARACTER_BUSINESS &&
          link.source?.type === EntityType.CHARACTER &&
          link.target?.type === EntityType.BUSINESS &&
          link.target.id === business.id
        );
        return owner ? [business.id, owner.source.id] as const : null;
      })).then((entries) => {
        if (!cancelled) setBusinessCharacterIds(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>));
      }).catch(() => {
        if (!cancelled) setBusinessCharacterIds({});
      });
      return () => { cancelled = true; };
    }, [businesses]);

    useEffect(() => {
      let cancelled = false;
      Promise.all(contracts.map(async (contract) => {
        const links = await ClientAPI.getLinksFor({ type: EntityType.CONTRACT, id: contract.id });
        const result: { id: string; value: { owner?: string; counterparty?: string } } = {
          id: contract.id,
          value: {},
        };
        links.filter((link: any) => link.linkType === LinkType.CHARACTER_CONTRACT).forEach((link: any) => {
          if (link.relationship === 'owner') result.value.owner = link.source?.id;
          if (link.relationship === 'counterparty') result.value.counterparty = link.source?.id;
        });
        return result;
      })).then((entries) => {
        if (!cancelled) setContractCharacterIds(Object.fromEntries(entries.map((entry) => [entry.id, entry.value])));
      }).catch(() => {
        if (!cancelled) setContractCharacterIds({});
      });
      return () => { cancelled = true; };
    }, [contracts]);

    const businessIdForCharacter = (characterId?: string) =>
      characterId ? Object.entries(businessCharacterIds).find(([, id]) => id === characterId)?.[0] : undefined;
    // State for Single Contract (Global for this sale)
    const [selectedContractId, setSelectedContractId] = useState<string>(() => {
      const boothContext = getBoothContext(sale);
      return (
      sale?.context?.contractId ||
        ""
      );
    });

    // State for Founder Character (Us)
    const [selectedFounderCharacterId, setSelectedFounderCharacterId] =
      useState<string>(() => {
        const boothContext = getBoothContext(sale);
        if (boothContext.principalBusinessId) {
            // Wait, we need the initial value. If we don't have businessCharacterIds resolved yet,
            // this might be empty initially. We will rely on the useEffect below to set it.
        }
        return "";
      });

    // State for Partner (Them)
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>(() => {
      const boothContext = getBoothContext(sale);
      if (sale?.partnerId) return sale.partnerId;
      // 1. Try modern metadata first
      if (boothContext.counterpartyBusinessId) {
        // Will be resolved by useEffect if it's a business ID
      }
      return "";
    }); // Partner identity is now directly Character-linked.

    // View Mode: 'Partner' | 'Off'
    const [viewMode, setViewMode] = useState<"Partner" | "Off">(() => {
      if (sale?.partnerId) return "Partner";
      return "Off";
    });

    // Derived State: Partner Entries (Single Source of Truth: lines)
    const partnerEntries = useMemo(() => {
      const serviceLines = lines.filter((l) => {
        // Aggressive fallback for older records that might have lost their 'station' or 'kind' enumerations
        const isServiceOrItem = l.kind === "service" || l.kind === "item";
        const lineStation = String((l as any).station || '').trim().toLowerCase();
        const hasPartnerStation = [
          'booth-sales',
          'partner-sales',
          'partner sales',
        ].includes(lineStation);
        const hasHistoricalDescription = l.description?.includes("[Partner:");
        const hasPartnerVault = Boolean(
          l.settlement?.partnerId,
        );

        return (
          isServiceOrItem &&
          (hasPartnerStation || hasHistoricalDescription || hasPartnerVault)
        );
      }) as ServiceLine[];
      return serviceLines.map((sl) => {
        // Safely cast to 'any' to dynamically extract either ServiceLine or ItemSaleLine values
        const line = sl as any;
        // New Booth writes keep the canonical line revenue only. Legacy
        // original amounts remain readable so old sales can still be edited.
        const amountUSD =
          line.revenue !== undefined
            ? extractMoneyValue(line.revenue)
            : (line.quantity || 0) * extractMoneyValue(line.unitPrice);
        const amountCRC =
          line.settlement?.originalAmountCRC ?? amountUSD * (exchangeRate || 500);
        const desc = line.description || "";
        const categoryMatch = desc.includes("] ") ? desc.split("] ")[1] : desc;

        return {
          id: line.lineId || line.itemId || uuid(),
          description: desc,
          amountCRC: Number.isFinite(amountCRC) ? amountCRC : 0,
          amountUSD: Number.isFinite(amountUSD) ? amountUSD : 0,
          category: line.settlement?.category || categoryMatch || "Other",
          partnerId:
            line.settlement?.partnerId ||
            "",
        };
      });
    }, [lines, exchangeRate]);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Payments Logic: Auto-calculate remaining need
    // "reduce from colones then convert to dollars"

    // Quick Entry Form State
    const [quickAmountCRC, setQuickAmountCRC] = useState<string>("");
    const [quickAmountUSD, setQuickAmountUSD] = useState<string>("");
    // const [quickDesc, setQuickDesc] = useState<string>(''); // Removed as requested
    const [quickCat, setQuickCat] = useState<string>("");

    // Payment Distribution State
    // Modifiable Financials State (First-Class Fields)
    const [boothCost, setBoothCost] = useState<number>(() =>
      getInitialBoothCostCRC(sale, exchangeRate || 500),
    );
    const [paymentBitcoin, setPaymentBitcoin] = useState<number>(
      getInitialPaymentInput(
        sale,
        PaymentMethod.BTC,
        exchangeRate || 500,
        getLegacyPaymentBreakdown(sale)?.bitcoin,
      ),
    );
    const [paymentCard, setPaymentCard] = useState<number>(
      getInitialPaymentInput(
        sale,
        PaymentMethod.CARD,
        exchangeRate || 500,
        getLegacyPaymentBreakdown(sale)?.card,
      ),
    );
    const [paymentCashCRC, setPaymentCashCRC] = useState<number>(
      getInitialPaymentInput(
        sale,
        PaymentMethod.FIAT_CRC,
        exchangeRate || 500,
        getLegacyPaymentBreakdown(sale)?.cashCRC,
      ),
    );
    const [paymentCashUSD, setPaymentCashUSD] = useState<number>(
      getInitialPaymentInput(
        sale,
        PaymentMethod.FIAT_USD,
        exchangeRate || 500,
        getLegacyPaymentBreakdown(sale)?.cashUSD,
      ),
    );

    // Effect to auto-calculate Cash remainder initially (OPTIONAL)
    // For now, minimizing magic. If user wants to type, let them type.
    // But helpful to pre-fill? Maybe not, complicates "editable".
    // Let's leave them 0 for now or user can fill.
    // Actually, "auto-calculated Cash remainder display" was the OLD feature.
    // New feature is "Split... into two editable fields".
    // Users might prefer auto-calc. Let's start with 0.

    // Load Defaults (One-time on Mount)
    useEffect(() => {
      // 1. Load Default Contract (if needed)
      const defaultContract = contracts.find(
        (c) => c.status === ContractStatus.ACTIVE,
      );
      if (defaultContract && !selectedContractId && !sale) {
        setSelectedContractId(defaultContract.id);
      }

      // 2. Load Default Founder Character
      if (!selectedFounderCharacterId && characters.length > 0) {
        // Find first founder character
        const founderChar = characters.find((c) => c.roles.includes(CharacterRole.FOUNDER));
        if (founderChar) setSelectedFounderCharacterId(founderChar.id);
      }
    }, [
      sale,
      contracts,
      characters,
      selectedContractId,
      selectedFounderCharacterId,
    ]);

    // Load Default Partner (One time)
    useEffect(() => {
      // Mocking "Maria" as default if she exists IF viewMode is NOT Off AND NOT EDITING
      if (
        !sale &&
        viewMode !== "Off" &&
        !selectedPartnerId &&
        characters.length > 0
      ) {
        const maria = characters.find(
          (c) =>
            c.name.toLowerCase().includes("maria") || c.name.includes("O2"),
        );
        if (maria) {
          setSelectedPartnerId(maria.id);
        }
      }

      // Clear selection if Off
      if (viewMode === "Off") {
        setSelectedPartnerId("");
      }
    }, [characters, selectedPartnerId, viewMode, sale]);

    const initialPartnerIdRef = useRef(selectedPartnerId);
    const initialFounderIdRef = useRef(selectedFounderCharacterId);

    // Auto-select active contract when Partner or Founder Character changes
    useEffect(() => {
      const isNewSale = !sale;
      const didPartnerChange =
        selectedPartnerId !== initialPartnerIdRef.current;
      const didFounderChange =
        selectedFounderCharacterId !== initialFounderIdRef.current;

      // DO NOT overwrite the saved contract on mount for an existing sale!
      if (!isNewSale && !didPartnerChange && !didFounderChange) {
        return;
      }

      if (!selectedPartnerId || !selectedFounderCharacterId) {
        setSelectedContractId("");
        return;
      }

      // 1. Try Strict Match (ID matches both selected Principal and Counterparty Character)
      let match = contracts.find(
        (c) =>
          c.status === ContractStatus.ACTIVE &&
          (() => {
            const party = contractCharacterIds[c.id] || {};
            const ownerId = party.owner;
            const counterpartyId = party.counterparty;
            return (ownerId === selectedFounderCharacterId && counterpartyId === selectedPartnerId) ||
              (counterpartyId === selectedFounderCharacterId && ownerId === selectedPartnerId);
          })(),
      );

      if (match) {
        setSelectedContractId(match.id);
      } else {
        // No contract found for this pair -> Clear selection (Default/No Contract)
        setSelectedContractId("");
      }
    }, [
      selectedPartnerId,
      selectedFounderCharacterId,
      contracts,
      sale,
      contractCharacterIds,
    ]);
    // ============================================================================

    const myItems = useMemo(
      () => lines.filter((l): l is ItemSaleLine => l.kind === "item"),
      [lines],
    );

    // Unified logic to find the single active contract
    const activeContract = useMemo(() => {
      if (!selectedContractId) return null;
      return contracts.find((c) => c.id === selectedContractId);
    }, [contracts, selectedContractId]);

    const totals = useMemo(() => {
      let grossSales = 0;
      let akilesNet = 0;
      let partnerNet = 0;

      // 1. Calculate Baselines (Respecting Currency)
      // Assumption: All Inventory Items (Products & Bundles) are priced in USD for Booth-Sales.
      const myItemsTotalUSD = myItems.reduce(
        (s, i) => s + (extractMoneyValue(i.unitPrice) || 0) * (i.quantity || 0),
        0,
      );

      // Normalize my sales to Colones for calculation (Standardizing on CRC for Booth-Sales Ledger)
      const myItemsTotalValue_CRC = myItemsTotalUSD * exchangeRate;

      // Partner Entries are entered in Colones (and USD now)
      const partnerItemsTotal_CRC = partnerEntries.reduce((sum, e) => {
        const crcVal = e.amountCRC || 0;
        const usdValAsCRC = (e.amountUSD || 0) * exchangeRate;
        return sum + crcVal + usdValAsCRC;
      }, 0);

      // 2. Default Shares (No Contract Defaults = 100% Me, 0% Partner, Me pays Costs)
      let shareOfMyItems_Me = 1.0;
      let shareOfPartnerItems_Me = 0.0;
      let shareOfExpenses_Me = 1.0;

      // 3. Apply Contract Clauses (Corrected Logic)
      if (activeContract) {
        // A. Principal Items (My Items) -> Apply SALES_COMMISSION Clause (If I pay comm)
        // Logic: I keep 'companyShare' of My Items.
        const commClause = activeContract.clauses.find(
          (c) => c.type === ContractClauseType.SALES_COMMISSION,
        );
        if (commClause) {
          shareOfMyItems_Me = commClause.companyShare;
        }

        // B. Partner Items (Their Items) -> Apply SALES_SERVICE Clause (If I provide service)
        // Logic: I keep 'companyShare' of Their Items (My Commission).
        const serviceClause = activeContract.clauses.find(
          (c) => c.type === ContractClauseType.SALES_SERVICE,
        );
        if (serviceClause) {
          shareOfPartnerItems_Me = serviceClause.companyShare;
        }

        // C. Expense Sharing
        const expenseClause = activeContract.clauses.find(
          (c) => c.type === ContractClauseType.EXPENSE_SHARING,
        );
        if (expenseClause) {
          shareOfExpenses_Me = expenseClause.companyShare;
        }
      }

      // 4. Calculate Values (In CRC)
      const revenueMyItems_Me = myItemsTotalValue_CRC * shareOfMyItems_Me;
      const revenueMyItems_Partner =
        myItemsTotalValue_CRC * (1 - shareOfMyItems_Me);

      const revenuePartnerItems_Me =
        partnerItemsTotal_CRC * shareOfPartnerItems_Me; // My Commission
      const revenuePartnerItems_Partner =
        partnerItemsTotal_CRC * (1 - shareOfPartnerItems_Me);

      const cost_Me = boothCost * shareOfExpenses_Me;
      const cost_Partner = boothCost - cost_Me;

      // 5. Final Calculations
      grossSales = myItemsTotalValue_CRC + partnerItemsTotal_CRC;

      // Akiles Net (CRC)
      akilesNet = revenueMyItems_Me + revenuePartnerItems_Me - cost_Me;

      // Partner Net (CRC)
      partnerNet =
        revenuePartnerItems_Partner + revenueMyItems_Partner - cost_Partner;

      return {
        grossSales,
        myNet: akilesNet,
        partnerNet,
        myCommissions: revenuePartnerItems_Me,
        partnerCommissions: revenuePartnerItems_Partner,
        breakdown: {
          principalSharePct_Me: shareOfMyItems_Me * 100,
          principalSharePct_Partner: (1 - shareOfMyItems_Me) * 100,
          partnerSharePct_Me: shareOfPartnerItems_Me * 100,
          partnerSharePct_Partner: (1 - shareOfPartnerItems_Me) * 100,
          mySales: myItemsTotalValue_CRC,
          partnerSales: partnerItemsTotal_CRC,
          costMe: cost_Me,
          costPartner: cost_Partner,
        },
      };
    }, [myItems, partnerEntries, boothCost, activeContract, exchangeRate]);

    const getPartnerName = (id: string) => {
      const char = characters.find((c) => c.id === id);
      if (char) return char.name;
      const bus = businesses.find((b) => b.id === id);
      if (bus) return bus.name;
      return "Unknown";
    };

    const salesDistributionMatrix = useMemo(() => {
      // 1. Group Akiles Items (from lines)
      const akilesRows: Record<string, SettlementRow> = {};
      const partnerRows: Record<string, SettlementRow> = {};

      // Process Real Lines (Akiles Inventory)
      lines
        .filter((l): l is ItemSaleLine => l.kind === "item")
        .forEach((line) => {
          const itemLine = line;

          let total = 0;
          let category = "Other";

          const metaUSD = (itemLine as any).settlement?.totalUSD ?? 0;
          const metaCRC = (itemLine as any).settlement?.totalCRC ?? 0;

          if (metaUSD > 0 || metaCRC > 0) {
            total = (itemLine.quantity || 0) * (extractMoneyValue(itemLine.unitPrice) || 0);
          } else {
            total = (itemLine.quantity || 0) * (extractMoneyValue(itemLine.unitPrice) || 0);
          }

          const item = items.find((i) => i.id === itemLine.itemId);
          if (item) {
            category = (item as any).subItemType
              ? `${item.type}: ${(item as any).subItemType}`
              : item.type;
          }

          if (!akilesRows[category]) {
            akilesRows[category] = {
              id: category,
              label: category,
              isPartner: false,
              totalColones: metaCRC,
              totalDollars: metaUSD > 0 || metaCRC > 0 ? metaUSD : total,
              totalBitcoin: 0,
              totalCard: 0,
              commissionAmount: 0,
              ownerAmount: 0,
            };
          } else {
            akilesRows[category].totalDollars +=
              metaUSD > 0 || metaCRC > 0 ? metaUSD : total;
            akilesRows[category].totalColones += metaCRC;
          }
        });

      // Process Partner Entries
      partnerEntries.forEach((entry) => {
        // Basic category grouping
        const catLabel = entry.category || "Other";
        if (!partnerRows[catLabel]) {
          partnerRows[catLabel] = {
            id: catLabel,
            label: catLabel,
            isPartner: true,
            totalColones: entry.amountCRC || 0,
            totalDollars: entry.amountUSD || 0,
            totalBitcoin: 0,
            totalCard: 0,
            commissionAmount: 0,
            ownerAmount: 0,
          };
        } else {
          partnerRows[catLabel].totalColones += entry.amountCRC || 0;
          partnerRows[catLabel].totalDollars += entry.amountUSD || 0;
        }
      });

      // Apply calculated splits from the 'totals' memo to the rows for display
      Object.values(akilesRows).forEach((row) => {
        const totalValue = row.totalColones + row.totalDollars * exchangeRate;
        row.ownerAmount =
          totalValue * (totals.breakdown.principalSharePct_Me / 100);
        row.commissionAmount =
          totalValue * (totals.breakdown.principalSharePct_Partner / 100);
      });

      Object.values(partnerRows).forEach((row) => {
        const totalValue = row.totalColones + row.totalDollars * exchangeRate;
        row.ownerAmount =
          totalValue * (totals.breakdown.partnerSharePct_Me / 100);
        row.commissionAmount =
          totalValue * (totals.breakdown.partnerSharePct_Partner / 100);
      });

      return {
        akiles: Object.values(akilesRows),
        partner: Object.values(partnerRows),
      };
    }, [partnerEntries, items, exchangeRate, totals, lines]);

    // Payments Logic: Auto-calculate remaining need
    // Moved here to be after salesDistributionMatrix is defined
    useEffect(() => {
      // 1. Calculate Total Incomes (Separated by Currency)
      const totalCRC =
        salesDistributionMatrix.akiles.reduce(
          (acc, r) => acc + r.totalColones,
          0,
        ) +
        salesDistributionMatrix.partner.reduce(
          (acc, r) => acc + r.totalColones,
          0,
        );

      const totalDollars =
        salesDistributionMatrix.akiles.reduce(
          (acc, r) => acc + r.totalDollars,
          0,
        ) +
        salesDistributionMatrix.partner.reduce(
          (acc, r) => acc + r.totalDollars,
          0,
        );

      // 2. Calculate Non-USD Payments (Card, BTC, CashCRC)
      const paymentCardVal = Number(paymentCard) || 0;
      const paymentBtcVal = Number(paymentBitcoin) || 0;
      const paymentCashCRCVal = Number(paymentCashCRC) || 0;

      // 3. Logic:
      // Cash USD = (Total Sales USD) + Remaining Colones Value Converted to USD
      // Remaining Colones = Total Sales CRC - Card - BTC - CashCRC
      const remainingCRC =
        totalCRC - paymentCardVal - paymentBtcVal - paymentCashCRCVal;

      // Convert remainder to USD
      const remainingCRCInUSD = remainingCRC / exchangeRate;

      // Final Expected Cash USD
      const expectedCashUSD = totalDollars + remainingCRCInUSD;

      // 4. Update State
      // Ensure accurate rounding to 2 decimal places to match currency conventions
      const groundedUSD = Math.round(expectedCashUSD * 100) / 100;

      setPaymentCashUSD(groundedUSD);
    }, [
      salesDistributionMatrix,
      paymentCard,
      paymentBitcoin,
      paymentCashCRC,
      exchangeRate,
    ]);

    // 3. Handlers
    // ============================================================================

    const handleAddPartnerEntry = () => {
      const amountCRC = parseFloat(quickAmountCRC) || 0;
      const amountUSD = parseFloat(quickAmountUSD) || 0;

      if ((amountCRC <= 0 && amountUSD <= 0) || !selectedPartnerId || !quickCat)
        return;

      // Create the ServiceLine directly
      const newLineId = uuid();
      const safeExchangeRate = exchangeRate || 500;

      const newServiceLine: ServiceLine = {
        lineId: newLineId,
        kind: "service",
        station: SalesStation.BOOTH_SALES as Station,
        // Revenue in USD (Source of Truth for Financials)
        revenue: toMoney(amountCRC / safeExchangeRate + amountUSD),
        taxAmount: toMoney(0),
        settlement: {
          category: quickCat,
          partnerId: selectedPartnerId,
        },
      } as unknown as ServiceLine;

      // Add directly to lines (Single Source of Truth)
      setLines([...lines, newServiceLine]);

      setQuickAmountCRC("");
      setQuickAmountUSD("");
      setQuickCat("");
    };

    const handleRemovePartnerEntry = (id: string) => {
      // Remove directly from lines
      setLines(lines.filter((l) => l.lineId !== id));
    };

    const handleRemoveLine = (lineId: string) => {
      setLines(lines.filter((l) => l.lineId !== lineId));
    };

    // Handler to merge everything and Save
    const handleSave = () => {
      if (!siteId) {
        alert("Please select a Site.");
        return;
      }

      // Safeguard against division by zero
      const safeExchangeRate = exchangeRate || 500;

      // 1. Normalize partner attribution without persisting calculated shares.
      // The linked contract remains the authority for settlement percentages.
      const updatedLines = lines.map((line) => {
        if (line.kind === "service" && line.station === "booth-sales") {
          return {
            ...line,
            settlement: {
              // Contract clauses are the authority for these percentages.
              // Do not persist a calculated snapshot on the sale line.
              category: (line as any).settlement?.category,
              partnerId: (line as any).settlement?.partnerId ?? null,
            },
          };
        }
        return line;
      });

      // 2. (Skipped) Combine Step is gone. updatedLines IS allLines.

      // 3. Construct Metadata Context
      // Payment inputs are entered in their received currency, but the
      // canonical Sale payment amounts are persisted in USD. The method keeps
      // the original payment instrument/currency visible to the workflow.
      const payments = [
        { method: PaymentMethod.BTC, amount: paymentBitcoin / safeExchangeRate },
        { method: PaymentMethod.CARD, amount: paymentCard / safeExchangeRate },
        { method: PaymentMethod.FIAT_CRC, amount: paymentCashCRC / safeExchangeRate },
        { method: PaymentMethod.FIAT_USD, amount: paymentCashUSD },
      ]
        .filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0)
        .map((payment) => ({
          method: payment.method,
          amount: toMoney(payment.amount, "USD"),
        }));

      // Do not carry the legacy payment containers forward when editing an
      // older Booth sale. They remain readable by compatibility code, but new
      // persistence has one authority: Sale.payments.
      const {
        boothCost: _existingBoothCost,
        paymentBreakdown: _legacyPaymentBreakdown,
        rewardIntent: _legacyRewardIntent,
        boothSaleContext: _legacyBoothSaleContext,
        ...saleContextWithoutLegacyPayments
      } = (sale?.context as (Sale['context'] & {
        paymentBreakdown?: unknown;
      }) | undefined) || {};
      const boothCostUSD = boothCost > 0 ? boothCost / safeExchangeRate : 0;

      // 4. Construct FULL Valid Sale Object
      // Using CHARGED as the standard 'Completed' status for sales
      const saleId = sale?.id || uuid(); // Preserve ID if exists
      const saleName = buildAutoSaleName(
        SaleType.BOOTH,
        siteId,
        saleDate,
        sites,
      );

      const fullSale: Sale = {
        id: saleId,
        name: saleName,
        description: "Feria / Booth Sale",
        saleDate: saleDate,
        type: SaleType.BOOTH,
        status: status,
        siteId: siteId,
        characterId: null,
        partnerId:
          viewMode === "Partner" && selectedPartnerId
            ? selectedPartnerId
            : null,

        // Financials (Converted to USD)
        lines: updatedLines,
        payments,
        totals: {
          subtotal: toMoney(totals.grossSales / safeExchangeRate),
          discountTotal: toMoney(0),
          taxTotal: toMoney(0),
          totalRevenue: toMoney(totals.grossSales / safeExchangeRate),
        },

        context: {
          ...saleContextWithoutLegacyPayments,
          // The UI collects the booth cost in CRC; persist it only when used.
          ...(boothCostUSD > 0 ? { boothCost: toMoney(boothCostUSD, "USD") } : {}),
          contractId: selectedContractId || null,
        },

        // Canonical lifecycle state
        createdAt: sale?.createdAt || new Date(),
        updatedAt: new Date(),
        lifecycle: {
          ...(sale?.lifecycle || {}),
          doneAt: doneAt?.toISOString(),
          collectedAt: collectedAt?.toISOString(),
        },
      } as unknown as Sale;

      // 5. Pass to Parent
      onSave(fullSale);
    };

    const handleBoothSaveRef = useRef(handleSave);
    handleBoothSaveRef.current = handleSave;
    useImperativeHandle(
      ref,
      () => ({
        submitBoothSave: () => {
          handleBoothSaveRef.current();
        },
      }),
      [],
    );

    // 4. Render
    // ============================================================================
    return (
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 -mx-4 -mt-4 -mb-2 p-4 pt-6 overflow-hidden">
        {/* Header / Setup Toolbar */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border mb-4 shrink-0 overflow-x-auto">
          {/* Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Date:
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-left font-normal w-32"
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {saleDate ? (
                    formatForDisplay(saleDate)
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={saleDate}
                  onSelect={(d) => d && setSaleDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Rate */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700/50">
            <span className="text-xs font-bold text-slate-500">$/₡:</span>
            <span className="text-xs font-medium text-slate-400">
              {exchangeRate}
            </span>
          </div>

          {/* Booth Cost */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Booth Cost:
            </span>
            <NumericInput
              value={boothCost}
              onChange={setBoothCost}
              className="h-8 w-24 border-red-500/30 text-red-500 font-medium text-xs bg-slate-900/50"
              placeholder="0"
            />
          </div>

          {/* Site */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Site:
            </span>
            <SearchableSelect
              value={siteId}
              onValueChange={setSiteId}
              options={createSiteOptionsWithCategories(sites)}
              autoGroupByCategory
              placeholder="Select site..."
              className="h-8 w-40"
            />
          </div>

          {/* Booth-Sales Lozenge (Relocated) */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 ml-2">
            <Store className="h-3 w-3 text-indigo-500" />
            <span className="text-[10px] font-bold text-indigo-500 whitespace-nowrap tracking-wider">
              booth-sales
            </span>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 ml-auto" />

          {/* Partner Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode("Off")}
                className={`text-[10px] px-2 py-1 rounded-sm transition-colors ${viewMode === "Off" ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-slate-300"}`}
              >
                Off
              </button>
              <button
                onClick={() => setViewMode("Partner")}
                className={`text-[10px] px-2 py-1 rounded-sm transition-colors ${viewMode === "Partner" ? "bg-pink-600 text-white font-medium" : "text-slate-400 hover:text-slate-300"}`}
              >
                Partner
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* SECTION B: SPLIT VIEW (My Inventory vs. Partner Sales) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
            <div className="flex flex-col gap-4">
              {/* Card 1: My Inventory (Akiles) */}
              <Card className="border-indigo-500/20 bg-indigo-950/20">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center text-indigo-300">
                      <User className="h-5 w-5 mr-2" />
                      Products
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                        onClick={() => setShowItemPicker(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      <Badge
                        variant="secondary"
                        className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                      >
                        {myItems.length}
                      </Badge>
                    </div>
                  </div>

                  {/* List of Added Items - Table View */}
                  <div className="max-h-[300px] overflow-y-auto rounded-md border border-indigo-500/20">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-indigo-900/30 text-indigo-200 sticky top-0 font-semibold">
                        <tr>
                          <th className="p-2 w-[40%]">Item</th>
                          <th className="p-2 w-[15%]">Price ($)</th>
                          <th className="p-2 w-[15%]">Calc ($)</th>
                          <th className="p-2 w-[15%]">Calc (₡)</th>
                          <th className="p-2 w-[5%] text-center">Qty</th>
                          <th className="p-2 w-[10%] text-right">Total ($)</th>
                          <th className="p-2 w-[5%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-500/10">
                        {myItems.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-4 text-center text-muted-foreground italic"
                            >
                              No items selected. Click &quot;Add&quot; to select
                              inventory.
                            </td>
                          </tr>
                        )}
                        {myItems.map((line) => {
                          const item = items.find(
                            (i) => i.id === (line as ItemSaleLine).itemId,
                          );
                          const meta = (line as any).settlement || {};
                          return (
                            <tr
                              key={line.lineId}
                              className="bg-slate-900/40 hover:bg-indigo-500/10 transition-colors group cursor-pointer"
                              onClick={() => setShowItemPicker(true)}
                            >
                              <td className="p-2 font-medium text-slate-200">
                                {item ? item.name : "Unknown Item"}
                              </td>
                              <td className="p-2 text-slate-400">
                                ${(extractMoneyValue(line.unitPrice) || 0).toFixed(2)}
                              </td>
                              <td className="p-2 text-slate-400 font-mono text-[10px]">
                                {meta.usdExpression || "-"}
                              </td>
                              <td className="p-2 text-slate-400 font-mono text-[10px]">
                                {meta.crcExpression || "-"}
                              </td>
                              <td className="p-2 text-center font-bold text-white bg-indigo-500/10 rounded">
                                {line.quantity}
                              </td>
                              <td className="p-2 text-right font-bold text-green-400">
                                $
                                {(
                                  (extractMoneyValue(line.unitPrice) || 0) * (line.quantity || 0)
                                ).toFixed(2)}
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveLine(line.lineId);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Partner */}
              {viewMode !== "Off" && (
                <Card className="border-pink-500/20 bg-pink-950/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="text-sm font-bold text-pink-400 flex items-center gap-2 relative">
                          <User className="h-4 w-4 shrink-0" />
                          <div className="relative">
                            <select
                              value={selectedPartnerId}
                              onChange={(e) =>
                                setSelectedPartnerId(e.target.value)
                              }
                              className={cn(
                                "h-8 w-44 rounded-md border bg-slate-900 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 truncate pr-6 appearance-none",
                                selectedPartnerId
                                  ? "border-pink-500/50 text-pink-200"
                                  : "border-slate-700 text-slate-400",
                              )}
                            >
                              <option value="" disabled>
                                Select Partner...
                              </option>
                              {characters
                                .filter((c) => {
                                  if (c.id === selectedFounderCharacterId) return false; // Explicitly blacklist Founder
                                  
                                  return contracts.some((contract) => {
                                      if (contract.status !== ContractStatus.ACTIVE) return false;
                                      const party = contractCharacterIds[contract.id] || {};
                                      return (party.owner === selectedFounderCharacterId && party.counterparty === c.id) ||
                                             (party.counterparty === selectedFounderCharacterId && party.owner === c.id);
                                  });
                                })
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-pink-400/50 text-[10px]">
                              ▼
                            </span>
                          </div>
                          {selectedPartnerId && (
                            <span className="text-[10px] font-normal text-pink-500/70 ml-1">
                              ({viewMode})
                            </span>
                          )}
                        </div>
                        {/* Contract Selector */}
                        {selectedPartnerId && (
                          <div className="flex items-center gap-2 w-auto border-l border-pink-500/20 pl-4 ml-auto">
                            <div className="w-auto text-[10px] text-pink-300 font-medium shrink-0">
                              Contract:
                            </div>
                            <div className="w-36 relative">
                              <select
                                value={selectedContractId}
                                onChange={(e) =>
                                  setSelectedContractId(e.target.value)
                                }
                                className="h-6 w-full rounded border border-pink-500/30 bg-pink-950/30 px-2 pr-5 text-[10px] shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-pink-100 truncate appearance-none"
                              >
                                <option value="" disabled>
                                  Select Active Contract...
                                </option>
                                {contracts
                                  .filter((c) => {
                                    if (
                                      !["Active", "ACTIVE", "active"].includes(
                                        c.status,
                                      )
                                    )
                                      return false;
                                    
                                    const party = contractCharacterIds[c.id] || {};
                                    return (party.owner === selectedFounderCharacterId && party.counterparty === selectedPartnerId) ||
                                           (party.counterparty === selectedFounderCharacterId && party.owner === selectedPartnerId);
                                  })
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-pink-400/50 text-[8px]">
                                ▼
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Entry Form (Only show if partner is selected) */}
                    {selectedPartnerId && (
                      <>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2 mt-2">
                          <div className="flex gap-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] text-pink-500 font-bold">
                                ₡
                              </span>
                              <NumericInput
                                value={parseFloat(quickAmountCRC) || 0}
                                onChange={(val) =>
                                  setQuickAmountCRC(val.toString())
                                }
                                placeholder="0"
                                className="w-24 bg-slate-950 border-slate-700 h-8 text-xs pl-5"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] text-green-500 font-bold">
                                $
                              </span>
                              <NumericInput
                                value={parseFloat(quickAmountUSD) || 0}
                                onChange={(val) =>
                                  setQuickAmountUSD(val.toString())
                                }
                                placeholder="0.00"
                                className="w-24 bg-slate-950 border-slate-700 h-8 text-xs pl-5"
                              />
                            </div>
                            <Input
                              value={quickCat}
                              onChange={(e) => setQuickCat(e.target.value)}
                              placeholder="Description / Category"
                              className="flex-1 bg-slate-950 border-slate-700 h-8 text-xs"
                            />
                            <Button
                              onClick={handleAddPartnerEntry}
                              className="bg-pink-600 hover:bg-pink-700 text-white shrink-0 h-8 text-xs"
                              disabled={!quickAmountCRC && !quickAmountUSD}
                              size="sm"
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* List - Table View */}
                        <div className="max-h-[200px] overflow-y-auto rounded-md border border-pink-500/20">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-pink-900/30 text-pink-200 sticky top-0 font-semibold">
                              <tr>
                                <th className="p-2 w-[40%]">Description</th>
                                <th className="p-2 w-[25%] text-right">
                                  Amount ($)
                                </th>
                                <th className="p-2 w-[25%] text-right">
                                  Amount (₡)
                                </th>
                                <th className="p-2 w-[10%]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-pink-500/10">
                              {partnerEntries.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="p-4 text-center text-muted-foreground italic"
                                  >
                                    No entries yet.
                                  </td>
                                </tr>
                              )}
                              {partnerEntries.map((entry) => (
                                <tr
                                  key={entry.id}
                                  className="bg-slate-900/40 hover:bg-pink-500/10 transition-colors group"
                                >
                                  <td className="p-2 text-slate-300 font-medium">
                                    {entry.category || entry.description}
                                  </td>
                                  <td className="p-2 text-slate-400 text-right font-mono">
                                    {entry.amountUSD
                                      ? `$${entry.amountUSD.toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="p-2 text-slate-400 text-right font-mono">
                                    {entry.amountCRC
                                      ? `₡${entry.amountCRC.toLocaleString()}`
                                      : "-"}
                                  </td>
                                  <td className="p-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() =>
                                        handleRemovePartnerEntry(entry.id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* SECTION C: SETTLEMENT MATRIX (The Excel View) - Right Column */}
          <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
            {/* Matrix Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto bg-slate-900/30">
              {/* Akiles Section */}
              {salesDistributionMatrix.akiles.length > 0 && (
                <div className="p-2 bg-indigo-950/20 border-b border-indigo-500/10">
                  {/* Embedded Header for Akiles Section */}
                  {/* <div className="grid grid-cols-12 gap-2 px-2 mb-2 items-end">

                                        <div className={`text-right text-[10px] font-semibold text-slate-500 ${selectedPartnerId ? 'col-span-2' : 'col-span-3'}`}>T₡</div>
                                        <div className={`text-right text-[10px] font-semibold text-slate-500 ${selectedPartnerId ? 'col-span-2' : 'col-span-3'}`}>T$</div>
                                        {selectedPartnerId && (
                                            <>
                                                <div className="col-span-2 text-right text-[9px] font-bold text-indigo-400 leading-none whitespace-nowrap">OUR SHARE $</div>
                                                <div className="col-span-3 text-right text-[9px] font-bold text-pink-400 leading-none whitespace-nowrap">THEIR SHARE $</div>
                                            </>
                                        )}
                                    </div> */}

                  {salesDistributionMatrix.akiles.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-2 p-2 text-xs border-b border-indigo-500/10 last:border-0 hover:bg-white/5 transition-colors items-center"
                    >
                      <div
                        className={`font-medium text-indigo-100 truncate ${selectedPartnerId ? "col-span-3" : "col-span-6"}`}
                        title={row.label}
                      >
                        {row.label}
                      </div>
                      <div
                        className={`text-right font-mono text-slate-400 ${selectedPartnerId ? "col-span-2" : "col-span-3"}`}
                      >
                        ₡{row.totalColones.toLocaleString()}
                      </div>
                      <div
                        className={`text-right font-mono text-slate-300 ${selectedPartnerId ? "col-span-2" : "col-span-3"}`}
                      >
                        $
                        {row.totalDollars.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {selectedPartnerId && (
                        <>
                          <div className="col-span-2 text-right text-indigo-300 font-bold">
                            $
                            {(row.ownerAmount / exchangeRate).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </div>
                          <div className="col-span-3 text-right text-pink-300/70">
                            $
                            {(
                              row.commissionAmount / exchangeRate
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Partner Section (Only if selected) */}
              {selectedPartnerId &&
                salesDistributionMatrix.partner.length > 0 && (
                  <div className="p-2 bg-pink-950/20">
                    {/* Embedded Header for Partner Section */}
                    {/* <div className="grid grid-cols-12 gap-2 px-2 mt-4 mb-2 items-end">
                                        <div className="col-span-3 text-[10px] font-bold text-pink-400 uppercase tracking-wide truncate">
                                            {`PARTNER (${getPartnerName(selectedPartnerId).toUpperCase().split(' ')[0]})`}
                                        </div>
                                        <div className="col-span-2 text-right text-[10px] font-semibold text-slate-500">T₡</div>
                                        <div className="col-span-2 text-right text-[10px] font-semibold text-slate-500">T$</div>
                                        <div className="col-span-2 text-right text-[9px] font-bold text-indigo-400 leading-none whitespace-nowrap">OUR SHARE $</div>
                                        <div className="col-span-3 text-right text-[9px] font-bold text-pink-400 leading-none whitespace-nowrap">THEIR SHARE $</div>
                                    </div> */}

                    {salesDistributionMatrix.partner.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 gap-2 p-2 text-xs border-b border-pink-500/10 last:border-0 hover:bg-white/5 transition-colors items-center"
                      >
                        <div
                          className="col-span-3 font-medium text-pink-100 truncate"
                          title={row.label}
                        >
                          {row.label}
                        </div>
                        <div className="col-span-2 text-right font-mono text-slate-400">
                          ₡{row.totalColones.toLocaleString()}
                        </div>
                        <div className="col-span-2 text-right font-mono text-slate-300">
                          $
                          {row.totalDollars.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="col-span-2 text-right text-indigo-300/70">
                          $
                          {(row.ownerAmount / exchangeRate).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                        <div className="col-span-3 text-right text-pink-300 font-bold">
                          $
                          {(row.commissionAmount / exchangeRate).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
              <div
                className={`grid gap-4 ${selectedPartnerId ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {/* My Payout */}
                <div className="p-3 bg-slate-900 rounded-lg border border-indigo-500/20 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[10px]">
                      {selectedFounderCharacterId
                        ? characters
                            .find((c) => c.id === selectedFounderCharacterId)
                            ?.name.substring(0, 1)
                            .toUpperCase()
                        : "C"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-100 flex items-center gap-1">
                        <select
                          value={selectedFounderCharacterId}
                          onChange={(e) =>
                            setSelectedFounderCharacterId(e.target.value)
                          }
                          className="bg-transparent border-none p-0 h-auto text-indigo-100 font-bold hover:text-indigo-300 focus:ring-0 cursor-pointer appearance-none outline-none truncate max-w-[140px]"
                        >
                          {characters
                            .filter((c) => c.roles.includes(CharacterRole.FOUNDER))
                            .map((c) => (
                              <option
                                key={c.id}
                                value={c.id}
                                className="bg-slate-900"
                              >
                                {c.name}
                              </option>
                            ))}
                          {/* Fallback if no founder characters */}
                          {!characters.some((c) => c.roles.includes(CharacterRole.FOUNDER)) &&
                            characters.map((c) => (
                              <option
                                key={c.id}
                                value={c.id}
                                className="bg-slate-900"
                              >
                                {c.name}
                              </option>
                            ))}
                        </select>
                        <span className="text-indigo-400/50 text-[10px]">
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs bg-indigo-950/10 p-2 rounded border border-indigo-500/10">
                    {/* Footer: 3-Row Logic */}
                    <div className="border-t border-indigo-500/20 pt-2 mt-0">
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-indigo-100/70 mb-1 border-b border-indigo-500/10 pb-1">
                        <span></span>
                        <span className="text-right">₡</span>
                        <span className="text-right">$</span>
                      </div>

                      {/* Row 1: Sales */}
                      <div className="grid grid-cols-3 gap-2 text-xs text-indigo-100">
                        <span>Sales:</span>
                        <div className="text-right font-mono">
                          ₡
                          {salesDistributionMatrix.akiles
                            .reduce((s, r) => s + r.totalColones, 0)
                            .toLocaleString()}
                        </div>
                        <div className="text-right font-mono">
                          $
                          {salesDistributionMatrix.akiles
                            .reduce((s, r) => s + r.totalDollars, 0)
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                        </div>
                      </div>

                      {/* Row 2: Costs (Only in CRC) */}
                      <div className="grid grid-cols-3 gap-2 text-xs text-red-400">
                        <span>Costs:</span>
                        <div className="text-right font-mono text-red-400">
                          -₡{totals.breakdown.costMe.toLocaleString()}
                        </div>
                        <div className="text-right font-mono text-slate-600/50">
                          -
                        </div>
                      </div>

                      {/* Row 3: Net Cash (Calculated) */}
                      <div className="grid grid-cols-3 gap-2 text-xs text-indigo-200 font-semibold border-t border-indigo-500/10 mt-1 pt-1">
                        <span>Net:</span>
                        <div className="text-right font-mono">
                          ₡
                          {(
                            salesDistributionMatrix.akiles.reduce(
                              (s, r) => s + r.totalColones,
                              0,
                            ) - totals.breakdown.costMe
                          ).toLocaleString()}
                        </div>
                        <div className="text-right font-mono">
                          $
                          {salesDistributionMatrix.akiles
                            .reduce((s, r) => s + r.totalDollars, 0)
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                        </div>
                      </div>
                    </div>

                    {/* Final Total Row */}
                    <div className="grid grid-cols-3 gap-2 text-sm font-bold border-t border-indigo-500/20 pt-2 mt-2 text-indigo-400 items-end">
                      <span className="col-span-2 text-[10px] text-indigo-400/70 text-right uppercase tracking-wider pb-0.5">
                        Total Eq ($):
                      </span>
                      <span className="col-span-1 text-right text-base">
                        $
                        {(totals.myNet / exchangeRate).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Partner Payout (Conditional) */}
                {selectedPartnerId && (
                  <div className="p-3 bg-slate-900 rounded-lg border border-pink-500/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-[10px]">
                        {selectedPartnerId
                          ? getPartnerName(selectedPartnerId)
                              .substring(0, 1)
                              .toUpperCase()
                          : "P"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-pink-100">
                          {selectedPartnerId
                            ? getPartnerName(selectedPartnerId)
                            : "Partner"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs bg-pink-950/10 p-2 rounded border border-pink-500/10">
                      <div className="border-t border-pink-500/20 pt-2 mt-0">
                        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-pink-100/70 mb-1 border-b border-pink-500/10 pb-1">
                          <span></span>
                          <span className="text-right">₡</span>
                          <span className="text-right">$</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-pink-100">
                          <span>Sales:</span>
                          <div className="text-right font-mono">
                            ₡
                            {salesDistributionMatrix.partner
                              .reduce((s, r) => s + r.totalColones, 0)
                              .toLocaleString()}
                          </div>
                          <div className="text-right font-mono">
                            $
                            {salesDistributionMatrix.partner
                              .reduce((s, r) => s + r.totalDollars, 0)
                              .toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-red-400">
                          <span>Costs:</span>
                          <div className="text-right font-mono text-red-400">
                            -₡{totals.breakdown.costPartner.toLocaleString()}
                          </div>
                          <div className="text-right font-mono text-slate-600/50">
                            -
                          </div>
                        </div>

                        {/* Net Row */}
                        <div className="grid grid-cols-3 gap-2 text-xs text-pink-200 font-semibold border-t border-pink-500/10 mt-1 pt-1">
                          <span>Net:</span>
                          <div className="text-right font-mono">
                            ₡
                            {(
                              salesDistributionMatrix.partner.reduce(
                                (s, r) => s + r.totalColones,
                                0,
                              ) - totals.breakdown.costPartner
                            ).toLocaleString()}
                          </div>
                          <div className="text-right font-mono">
                            $
                            {salesDistributionMatrix.partner
                              .reduce((s, r) => s + r.totalDollars, 0)
                              .toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                          </div>
                        </div>
                      </div>

                      {/* Final Total Row */}
                      <div className="grid grid-cols-3 gap-2 text-sm font-bold border-t border-pink-500/20 pt-2 mt-2 text-pink-400 items-end">
                        <span className="col-span-2 text-[10px] text-pink-400/70 text-right uppercase tracking-wider pb-0.5">
                          Total Eq ($):
                        </span>
                        <span className="col-span-1 text-right text-base">
                          $
                          {(totals.partnerNet / exchangeRate).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-between items-center">
          {/* Item Selector Sub-Modal */}
          <SaleItemsSubModal
            open={showItemPicker}
            onOpenChange={setShowItemPicker}
            onSave={(selectedItems) => {
              // Convert SaleItemLine from submodal to ItemSaleLine for our lines
              const newLines: SaleLine[] = selectedItems.map(
                (saleItem) =>
                  ({
                    // Preserve existing line ids to keep stock/clone effects idempotent.
                    lineId: saleItem.id || uuid(),
                    kind: "item",
                    itemId: saleItem.itemId,
                    unitPrice: saleItem.unitPrice,
                    quantity: saleItem.quantity,
                    description: saleItem.itemName,
                    settlement: {
                      usdExpression: saleItem.usdExpression,
                      crcExpression: saleItem.crcExpression,
                      totalUSD: saleItem.totalUSD,
                      totalCRC: saleItem.totalCRC,
                    },
                  }) as unknown as ItemSaleLine,
              );

              // Replace ALL item lines with the new selection (since modal manages the full list)
              // Keep non-product lines (e.g. service)
              // The logic here replaces the previous "add to list" logic.
              // User Edit Flow: "Open modal -> See current items -> Edit/Add/Remove -> Save -> Replace list".

              const nonItemLines = lines.filter((l) => l.kind !== "item");
              setLines([...nonItemLines, ...newLines]);
              setShowItemPicker(false);
            }}
            initialItems={lines
              .filter((l) => l.kind === "item")
              .map((l) => {
                const il = l as ItemSaleLine;
                const item = items.find((i) => i.id === il.itemId);
                const soldLabel =
                  il.description?.trim() || item?.name || "Unknown Item";
                return {
                  id: il.lineId || uuid(),
                  itemId: il.itemId,
                  itemName: soldLabel,
                  quantity: il.quantity,
                  unitPrice: extractMoneyValue(il.unitPrice) || 0,
                  total: (il.quantity || 0) * (extractMoneyValue(il.unitPrice) || 0),
                  siteId: siteId,
                  usdExpression: (il as any).settlement?.usdExpression,
                  crcExpression: (il as any).settlement?.crcExpression,
                  totalUSD: (il as any).settlement?.totalUSD,
                  totalCRC: (il as any).settlement?.totalCRC,
                };
              })}
            defaultSiteId={siteId}
            exchangeRate={exchangeRate}
          />

          {/* Delete Confirmation Modal REMOVED - using Parent's Modal */}
        </div>
      </div>
    );
  },
);

export default BoothSalesView;
