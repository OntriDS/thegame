export interface AvailableArchiveMonth {
  key: string; // MM-YY
  label: string; // e.g., Jun 2025
  summary: {
    tasks: number;
    sales: number;
    financials: number;
    items: number;
    playerEvents: number;
  };
}

export interface ArchiveTableFilters {
  search: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface PlayerArchiveRow {
  id: string;
  sourceType: "task" | "financial" | "sale";
  sourceId: string;
  description: string;
  date: string;
  points: {
    hp: number;
    fp: number;
    rp: number;
    xp: number;
  };
}

// Base snapshot interface
export interface BaseSnapshot {
  id: string;
  sourceId: string;
  sourceType: 'TASK' | 'ITEM' | 'FINANCIAL' | 'SALE';
  snapshotDate: Date;
  collectedAt?: Date;
  soldAt?: Date;
  reason: 'collected' | 'sold' | 'archived';
  data: any; // Complete entity data at time of snapshot
  createdAt: Date;
}

// Entity-specific snapshot interfaces
export interface TaskSnapshot extends BaseSnapshot {
  sourceType: 'TASK';
  data: {
    id: string;
    name: string;
    description?: string;
    type: string;
    status: string;
    priority: string;
    station?: string;
    siteId?: string;
    targetSiteId?: string;
    progress: number;
    cost: number;
    revenue: number;
    rewards: {
      xp: number;
      rp: number;
      fp: number;
      hp: number;
    };
    isCollected: true; // Always true in snapshot
    collectedAt: Date;
    isCollectedByCharacterId?: string;
    pointsCollected: boolean;
    // ... other task fields
  };
}

export interface FinancialSnapshot extends BaseSnapshot {
  sourceType: 'FINANCIAL';
  data: {
    id: string;
    counterpartyName: string;
    description?: string;
    year: number;
    month: number;
    amount: number;
    type: 'income' | 'expense';
    company: string;
    status: 'COLLECTED'; // Always COLLECTED in snapshot
    collectedAt: Date;
    collectedByCharacterId?: string;
    isNotCharged?: boolean;
    isNotPaid?: boolean;
    // ... other financial fields
  };
}

export interface SaleSnapshot extends BaseSnapshot {
  sourceType: 'SALE';
  data: {
    id: string;
    counterpartyName: string;
    saleDate: Date;
    status: string;
    totals: {
      subtotal: number;
      taxAmount: number;
      totalRevenue: number;
      totalCost: number;
      netProfit: number;
    };
    isCollected: true; // Always true in snapshot
    collectedAt: Date;
    collectedByCharacterId?: string;
    siteId?: string;
    customerId?: string;
    lines: any[]; // SaleLine data
    // ... other sale fields
  };
}

export interface ItemSnapshot extends BaseSnapshot {
  sourceType: 'ITEM';
  data: {
    id: string;
    name: string;
    type: string;
    subType?: string;
    status: 'SOLD'; // Always SOLD in snapshot
    soldAt: Date;
    saleId?: string; // Which sale caused this snapshot (optional for manual SOLD)
    quantitySold: number;
    stock: any[]; // Stock at time of sale
    cost: number;
    price?: number;
    collection?: string;
    siteId?: string;
    // ... other item fields
  };
  reason: 'sold'; // Always 'sold' for ItemSnapshot
}


