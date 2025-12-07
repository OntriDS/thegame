'use client';

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Clipboard, Loader2 } from "lucide-react";
import type { AvailableArchiveMonth, PlayerArchiveRow } from "@/types/archive";
import type { Task, Sale, FinancialRecord, Item } from "@/types/entities";
import { formatDisplayDate } from "@/lib/utils/date-utils";
import { formatCurrency } from "@/lib/utils/financial-utils";
import { cn } from "@/lib/utils";

type ArchiveTabKey = "tasks" | "sales" | "financials" | "items";

interface MonthBoxTabsProps {
  month: AvailableArchiveMonth;
}

interface ColumnConfig<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  accessor: (row: Row) => React.ReactNode;
  sortValue?: (row: Row) => string | number;
}

interface TabState<Row> {
  data: Row[];
  filtered: Row[];
  isLoading: boolean;
  error: string | null;
  search: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  visibleColumns: Set<string>;
  page: number;
  lastCopiedId?: string | null;
}

const PAGE_SIZE = 50;

const defaultSorts: Record<ArchiveTabKey, { field: string; direction: "asc" | "desc" }> = {
  tasks: { field: "collectedAt", direction: "desc" },
  sales: { field: "saleDate", direction: "desc" },
  financials: { field: "collectedAt", direction: "desc" },
  items: { field: "saleDate", direction: "desc" },
  items: { field: "saleDate", direction: "desc" },
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

async function fetchArchiveData<Row>(entity: ArchiveTabKey, month: string): Promise<Row[]> {
  const response = await fetch(`/api/archive/${entity}?month=${month}`);
  if (!response.ok) throw new Error(`Failed to load ${entity}`);
  return await response.json();
}

const TaskColumns: ColumnConfig<Task>[] = [
  { key: "name", label: "Name", accessor: (row) => row.name, sortable: true, sortValue: (row) => row.name ?? "" },
  { key: "station", label: "Station", accessor: (row) => row.station, sortable: true, sortValue: (row) => row.station ?? "" },
  { key: "status", label: "Status", accessor: (row) => row.status, sortable: true, sortValue: (row) => row.status ?? "" },
  {
    key: "collectedAt",
    label: "Collected",
    accessor: (row) => (row.collectedAt ? formatDisplayDate(row.collectedAt) : "—"),
    sortable: true,
    sortValue: (row) => row.collectedAt ? new Date(row.collectedAt).getTime() : 0,
  },
  {
    key: "points",
    label: "Points",
    align: "right",
    accessor: (row) =>
      row.rewards?.points
        ? `HP:${row.rewards.points.hp ?? 0} FP:${row.rewards.points.fp ?? 0} RP:${row.rewards.points.rp ?? 0} XP:${row.rewards.points.xp ?? 0}`
        : "—",
    sortable: true,
    sortValue: (row) => {
      const points = row.rewards?.points;
      if (!points) return 0;
      return (points.hp ?? 0) + (points.fp ?? 0) + (points.rp ?? 0) + (points.xp ?? 0);
    },
  },
];

const SalesColumns: ColumnConfig<Sale>[] = [
  { key: "counterparty", label: "Counterparty", accessor: (row) => row.counterpartyName ?? "—", sortable: true, sortValue: (row) => row.counterpartyName ?? "" },
  { key: "site", label: "Site", accessor: (row) => row.siteId, sortable: true, sortValue: (row) => row.siteId ?? "" },
  {
    key: "saleDate",
    label: "Sale Date",
    accessor: (row) => formatDisplayDate(row.saleDate),
    sortable: true,
    sortValue: (row) => new Date(row.saleDate ?? new Date()).getTime(),
  },
  {
    key: "totalRevenue",
    label: "Revenue",
    align: "right",
    accessor: (row) => formatCurrency(row.totals?.totalRevenue ?? 0),
    sortable: true,
    sortValue: (row) => row.totals?.totalRevenue ?? 0,
  },
  {
    key: "status",
    label: "Status",
    accessor: (row) => row.status,
    sortable: true,
    sortValue: (row) => row.status ?? "",
  },
];

const FinancialColumns: ColumnConfig<FinancialRecord>[] = [
  { key: "name", label: "Name", accessor: (row) => row.name, sortable: true, sortValue: (row) => row.name ?? "" },
  { key: "station", label: "Station", accessor: (row) => row.station, sortable: true, sortValue: (row) => row.station ?? "" },
  {
    key: "collectedAt",
    label: "Collected",
    accessor: (row) => (row.collectedAt ? formatDisplayDate(row.collectedAt) : "—"),
    sortable: true,
    sortValue: (row) => row.collectedAt ? new Date(row.collectedAt).getTime() : 0,
  },
  {
    key: "cost",
    label: "Cost",
    align: "right",
    accessor: (row) => formatCurrency(row.cost ?? 0),
    sortable: true,
    sortValue: (row) => row.cost ?? 0,
  },
  {
    key: "revenue",
    align: "right",
    label: "Revenue",
    accessor: (row) => formatCurrency(row.revenue ?? 0),
    sortable: true,
    sortValue: (row) => row.revenue ?? 0,
  },
];

const ItemColumns: ColumnConfig<Item>[] = [
  { key: "name", label: "Name", accessor: (row) => row.name, sortable: true, sortValue: (row) => row.name ?? "" },
  { key: "type", label: "Type", accessor: (row) => row.type, sortable: true, sortValue: (row) => row.type ?? "" },
  {
    key: "quantitySold",
    label: "Qty Sold",
    align: "right",
    accessor: (row) => row.quantitySold ?? 0,
    sortable: true,
    sortValue: (row) => row.quantitySold ?? 0,
  },
  {
    key: "site",
    label: "Site",
    accessor: (row) => (row.stock?.[0]?.siteId ?? "—"),
    sortable: true,
    sortValue: (row) => row.stock?.[0]?.siteId ?? "",
  },
];



function getSearchString(row: unknown): string {
  return JSON.stringify(row).toLowerCase();
}

function applyFiltering<Row>(data: Row[], search: string): Row[] {
  const term = search.trim().toLowerCase();
  if (!term) return data;
  return data.filter((row) => getSearchString(row).includes(term));
}

function applySorting<Row>(
  data: Row[],
  columns: ColumnConfig<Row>[],
  sortField: string,
  direction: "asc" | "desc"
): Row[] {
  const column = columns.find((col) => col.key === sortField);
  if (!column || !column.sortable) return data;
  const factor = direction === "asc" ? 1 : -1;
  const sortValue = column.sortValue ?? ((row: Row) => {
    const value = column.accessor(row);
    if (typeof value === "string") return value.toLowerCase();
    if (typeof value === "number") return value;
    return `${value}`;
  });
  return [...data].sort((a, b) => {
    const valueA = sortValue(a);
    const valueB = sortValue(b);
    if (valueA === valueB) return 0;
    if (valueA > valueB) return factor;
    return -factor;
  });
}

function paginate<Row>(data: Row[], page: number, pageSize: number): Row[] {
  const start = (page - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

function InlineTotals({ badges }: { badges: { label: string; value: string | number }[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge) => (
        <Badge key={badge.label} variant="secondary" className="text-xs font-medium">
          {badge.label}: {badge.value}
        </Badge>
      ))}
    </div>
  );
}

function buildActiveEntityLink(entity: "task" | "sale" | "financial" | "item", id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  switch (entity) {
    case "task":
      return `${origin}/admin/control-room?taskId=${id}`;
    case "sale":
      return `${origin}/admin/sales?saleId=${id}`;
    case "financial":
      return `${origin}/admin/finances?financialId=${id}`;
    case "item":
      return `${origin}/admin/inventories?itemId=${id}`;
    default:
      return origin;
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error("[MonthBoxTabs] Failed to copy text:", error);
    return false;
  }
}

function renderTable<Row>(
  props: {
    tabState: TabState<Row>;
    columns: ColumnConfig<Row>[];
    onSearch: (value: string) => void;
    onSort: (key: string) => void;
    onToggleColumn: (key: string) => void;
    onChangePage: (page: number) => void;
    pageSize: number;
    totals: { label: string; value: string | number }[];
    renderActions?: (row: Row) => React.ReactNode;
  }
) {
  const {
    tabState,
    columns,
    onSearch,
    onSort,
    onToggleColumn,
    onChangePage,
    pageSize,
    totals,
    renderActions,
  } = props;

  const totalPages = Math.max(1, Math.ceil(tabState.filtered.length / pageSize));
  const paginated = paginate(tabState.filtered, tabState.page, pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            value={tabState.search}
            onChange={(event) => onSearch(event.target.value)}
            className="w-[260px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {columns.map((column) => {
                const isVisible = tabState.visibleColumns.has(column.key);
                const isLastVisible = isVisible && tabState.visibleColumns.size === 1;
                return (
                  <DropdownMenuItem
                    key={column.key}
                    onSelect={(event) => {
                      event.preventDefault();
                      if (isLastVisible) return;
                      onToggleColumn(column.key);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span>{column.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {isVisible ? "✓" : ""}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <InlineTotals badges={totals} />
      </div>

      {tabState.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {tabState.error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns
                .filter((col) => tabState.visibleColumns.has(col.key))
                .map((column) => {
                  const isActiveSort = tabState.sortField === column.key;
                  return (
                    <th
                      key={column.key}
                      className={cn(
                        "px-3 py-2 font-medium text-left select-none",
                        column.align === "right" && "text-right"
                      )}
                      onClick={() => column.sortable && onSort(column.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {column.label}
                        {column.sortable && (
                          <span className="text-muted-foreground">
                            {isActiveSort
                              ? tabState.sortDirection === "asc"
                                ? "▲"
                                : "▼"
                              : "▵▿"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              {renderActions && <th className="px-3 py-2 text-left text-xs font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tabState.isLoading ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No data for the current filters.
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={cn("border-t", rowIndex % 2 === 1 && "bg-muted/10")}
                >
                  {columns
                    .filter((col) => tabState.visibleColumns.has(col.key))
                    .map((column) => (
                      <td
                        key={column.key}
                        className={cn("px-3 py-2", column.align === "right" && "text-right")}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                  {renderActions && <td className="px-3 py-2">{renderActions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing {(tabState.page - 1) * pageSize + 1}–
          {Math.min(tabState.page * pageSize, tabState.filtered.length)} of{" "}
          {tabState.filtered.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={tabState.page <= 1}
            onClick={() => onChangePage(tabState.page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {tabState.page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={tabState.page >= totalPages}
            onClick={() => onChangePage(tabState.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MonthBoxTabs({ month }: MonthBoxTabsProps) {
  const [activeTab, setActiveTab] = useState<ArchiveTabKey>("tasks");

  const [taskState, setTaskState] = useState<TabState<Task>>({
    data: [],
    filtered: [],
    isLoading: true,
    error: null,
    search: "",
    sortField: defaultSorts.tasks.field,
    sortDirection: defaultSorts.tasks.direction,
    visibleColumns: new Set(TaskColumns.map((col) => col.key)),
    page: 1,
    lastCopiedId: null,
  });

  const [salesState, setSalesState] = useState<TabState<Sale>>({
    data: [],
    filtered: [],
    isLoading: true,
    error: null,
    search: "",
    sortField: defaultSorts.sales.field,
    sortDirection: defaultSorts.sales.direction,
    visibleColumns: new Set(SalesColumns.map((col) => col.key)),
    page: 1,
    lastCopiedId: null,
  });

  const [financialState, setFinancialState] = useState<TabState<FinancialRecord>>({
    data: [],
    filtered: [],
    isLoading: true,
    error: null,
    search: "",
    sortField: defaultSorts.financials.field,
    sortDirection: defaultSorts.financials.direction,
    visibleColumns: new Set(FinancialColumns.map((col) => col.key)),
    page: 1,
    lastCopiedId: null,
  });

  const [itemState, setItemState] = useState<TabState<Item>>({
    data: [],
    filtered: [],
    isLoading: true,
    error: null,
    search: "",
    sortField: defaultSorts.items.field,
    sortDirection: defaultSorts.items.direction,
    visibleColumns: new Set(ItemColumns.map((col) => col.key)),
    page: 1,
    lastCopiedId: null,
  });



  const handleCopyTaskLink = async (task: Task) => {
    const url = buildActiveEntityLink("task", task.id);
    const success = await copyToClipboard(url);
    if (success) {
      setTaskState((prev) => ({ ...prev, lastCopiedId: task.id }));
    }
  };

  const handleCopySaleLink = async (sale: Sale) => {
    const url = buildActiveEntityLink("sale", sale.id);
    const success = await copyToClipboard(url);
    if (success) {
      setSalesState((prev) => ({ ...prev, lastCopiedId: sale.id }));
    }
  };

  const handleCopyFinancialLink = async (financial: FinancialRecord) => {
    const url = buildActiveEntityLink("financial", financial.id);
    const success = await copyToClipboard(url);
    if (success) {
      setFinancialState((prev) => ({ ...prev, lastCopiedId: financial.id }));
    }
  };

  const handleCopyItemLink = async (item: Item) => {
    const url = buildActiveEntityLink("item", item.id);
    const success = await copyToClipboard(url);
    if (success) {
      setItemState((prev) => ({ ...prev, lastCopiedId: item.id }));
    }
  };



  useEffect(() => {
    const loadTasks = async () => {
      setTaskState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchArchiveData<Task>("tasks", month.key);
        setTaskState((prev) => {
          const filtered = applyFiltering(data, prev.search);
          const sorted = applySorting(filtered, TaskColumns, prev.sortField, prev.sortDirection);
          return {
            ...prev,
            data,
            filtered: sorted,
            isLoading: false,
            page: 1,
            lastCopiedId: null,
          };
        });
      } catch (error) {
        console.error("[MonthBoxTabs] Failed to load tasks:", error);
        setTaskState((prev) => ({ ...prev, isLoading: false, error: "Failed to load tasks" }));
      }
    };
    loadTasks();
  }, [month.key]);

  useEffect(() => {
    const loadSales = async () => {
      setSalesState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchArchiveData<Sale>("sales", month.key);
        setSalesState((prev) => {
          const filtered = applyFiltering(data, prev.search);
          const sorted = applySorting(filtered, SalesColumns, prev.sortField, prev.sortDirection);
          return {
            ...prev,
            data,
            filtered: sorted,
            isLoading: false,
            page: 1,
            lastCopiedId: null,
          };
        });
      } catch (error) {
        console.error("[MonthBoxTabs] Failed to load sales:", error);
        setSalesState((prev) => ({ ...prev, isLoading: false, error: "Failed to load sales" }));
      }
    };
    loadSales();
  }, [month.key]);

  useEffect(() => {
    const loadFinancials = async () => {
      setFinancialState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchArchiveData<FinancialRecord>("financials", month.key);
        setFinancialState((prev) => {
          const filtered = applyFiltering(data, prev.search);
          const sorted = applySorting(filtered, FinancialColumns, prev.sortField, prev.sortDirection);
          return {
            ...prev,
            data,
            filtered: sorted,
            isLoading: false,
            page: 1,
            lastCopiedId: null,
          };
        });
      } catch (error) {
        console.error("[MonthBoxTabs] Failed to load financials:", error);
        setFinancialState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load financials",
        }));
      }
    };
    loadFinancials();
  }, [month.key]);

  useEffect(() => {
    const loadItems = async () => {
      setItemState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchArchiveData<Item>("items", month.key);
        setItemState((prev) => {
          const filtered = applyFiltering(data, prev.search);
          const sorted = applySorting(filtered, ItemColumns, prev.sortField, prev.sortDirection);
          return {
            ...prev,
            data,
            filtered: sorted,
            isLoading: false,
            page: 1,
            lastCopiedId: null,
          };
        });
      } catch (error) {
        console.error("[MonthBoxTabs] Failed to load items:", error);
        setItemState((prev) => ({ ...prev, isLoading: false, error: "Failed to load items" }));
      }
    };
    loadItems();
  }, [month.key]);



  const totals = {
    tasks: useMemo(() => {
      const count = taskState.filtered.length;
      const sumPoints = taskState.filtered.reduce(
        (acc, task) => {
          const points = task.rewards?.points;
          if (!points) return acc;
          return {
            hp: acc.hp + (points.hp ?? 0),
            fp: acc.fp + (points.fp ?? 0),
            rp: acc.rp + (points.rp ?? 0),
            xp: acc.xp + (points.xp ?? 0),
          };
        },
        { hp: 0, fp: 0, rp: 0, xp: 0 }
      );
      return [
        { label: "Tasks", value: count },
        { label: "HP", value: sumPoints.hp },
        { label: "FP", value: sumPoints.fp },
        { label: "RP", value: sumPoints.rp },
        { label: "XP", value: sumPoints.xp },
      ];
    }, [taskState.filtered]),
    sales: useMemo(() => {
      const count = salesState.filtered.length;
      const totalRevenue = salesState.filtered.reduce(
        (sum, sale) => sum + (sale.totals?.totalRevenue ?? 0),
        0
      );
      return [
        { label: "Sales", value: count },
        { label: "Revenue", value: formatCurrency(totalRevenue) },
      ];
    }, [salesState.filtered]),
    financials: useMemo(() => {
      const count = financialState.filtered.length;
      const totalCost = financialState.filtered.reduce((sum, record) => sum + (record.cost ?? 0), 0);
      const totalRevenue = financialState.filtered.reduce((sum, record) => sum + (record.revenue ?? 0), 0);
      return [
        { label: "Records", value: count },
        { label: "Cost", value: formatCurrency(totalCost) },
        { label: "Revenue", value: formatCurrency(totalRevenue) },
      ];
    }, [financialState.filtered]),
    items: useMemo(() => {
      const count = itemState.filtered.length;
      const totalQuantity = itemState.filtered.reduce((sum, item) => sum + (item.quantitySold ?? 0), 0);
      return [
        { label: "Items", value: count },
        { label: "Qty Sold", value: totalQuantity },
      ];
    }, [itemState.filtered]),
  }, [itemState.filtered]),
};
  };

return (
  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ArchiveTabKey)} className="flex flex-col gap-4">
    <TabsList className="w-full justify-start overflow-x-auto">
      <TabsTrigger value="tasks">Tasks</TabsTrigger>
      <TabsTrigger value="sales">Sales</TabsTrigger>
      <TabsTrigger value="financials">Financials</TabsTrigger>
      <TabsTrigger value="items">Items</TabsTrigger>
    </TabsList>

    <TabsContent value="tasks" className="flex-1">
      {renderTable({
        tabState: taskState,
        columns: TaskColumns,
        onSearch: (value) =>
          setTaskState((prev) => {
            const filtered = applyFiltering(prev.data, value);
            const sorted = applySorting(filtered, TaskColumns, prev.sortField, prev.sortDirection);
            return { ...prev, search: value, filtered: sorted, page: 1 };
          }),
        onSort: (key) =>
          setTaskState((prev) => {
            const direction =
              prev.sortField === key && prev.sortDirection === "asc" ? "desc" : "asc";
            const sorted = applySorting(prev.filtered, TaskColumns, key, direction);
            return { ...prev, sortField: key, sortDirection: direction, filtered: sorted };
          }),
        onToggleColumn: (key) =>
          setTaskState((prev) => {
            const next = new Set(prev.visibleColumns);
            if (next.has(key) && next.size > 1) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return { ...prev, visibleColumns: next };
          }),
        onChangePage: (page) => setTaskState((prev) => ({ ...prev, page })),
        pageSize: PAGE_SIZE,
        totals: totals.tasks,
        renderActions: (task) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyTaskLink(task)}
            className="gap-2"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {taskState.lastCopiedId === task.id ? "Copied" : "Copy link"}
          </Button>
        ),
      })}
    </TabsContent>

    <TabsContent value="sales" className="flex-1">
      {renderTable({
        tabState: salesState,
        columns: SalesColumns,
        onSearch: (value) =>
          setSalesState((prev) => {
            const filtered = applyFiltering(prev.data, value);
            const sorted = applySorting(filtered, SalesColumns, prev.sortField, prev.sortDirection);
            return { ...prev, search: value, filtered: sorted, page: 1 };
          }),
        onSort: (key) =>
          setSalesState((prev) => {
            const direction =
              prev.sortField === key && prev.sortDirection === "asc" ? "desc" : "asc";
            const sorted = applySorting(prev.filtered, SalesColumns, key, direction);
            return { ...prev, sortField: key, sortDirection: direction, filtered: sorted };
          }),
        onToggleColumn: (key) =>
          setSalesState((prev) => {
            const next = new Set(prev.visibleColumns);
            if (next.has(key) && next.size > 1) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return { ...prev, visibleColumns: next };
          }),
        onChangePage: (page) => setSalesState((prev) => ({ ...prev, page })),
        pageSize: PAGE_SIZE,
        totals: totals.sales,
        renderActions: (sale) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopySaleLink(sale)}
            className="gap-2"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {salesState.lastCopiedId === sale.id ? "Copied" : "Copy link"}
          </Button>
        ),
      })}
    </TabsContent>

    <TabsContent value="financials" className="flex-1">
      {renderTable({
        tabState: financialState,
        columns: FinancialColumns,
        onSearch: (value) =>
          setFinancialState((prev) => {
            const filtered = applyFiltering(prev.data, value);
            const sorted = applySorting(filtered, FinancialColumns, prev.sortField, prev.sortDirection);
            return { ...prev, search: value, filtered: sorted, page: 1 };
          }),
        onSort: (key) =>
          setFinancialState((prev) => {
            const direction =
              prev.sortField === key && prev.sortDirection === "asc" ? "desc" : "asc";
            const sorted = applySorting(prev.filtered, FinancialColumns, key, direction);
            return { ...prev, sortField: key, sortDirection: direction, filtered: sorted };
          }),
        onToggleColumn: (key) =>
          setFinancialState((prev) => {
            const next = new Set(prev.visibleColumns);
            if (next.has(key) && next.size > 1) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return { ...prev, visibleColumns: next };
          }),
        onChangePage: (page) => setFinancialState((prev) => ({ ...prev, page })),
        pageSize: PAGE_SIZE,
        totals: totals.financials,
        renderActions: (financial) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyFinancialLink(financial)}
            className="gap-2"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {financialState.lastCopiedId === financial.id ? "Copied" : "Copy link"}
          </Button>
        ),
      })}
    </TabsContent>

    <TabsContent value="items" className="flex-1">
      {renderTable({
        tabState: itemState,
        columns: ItemColumns,
        onSearch: (value) =>
          setItemState((prev) => {
            const filtered = applyFiltering(prev.data, value);
            const sorted = applySorting(filtered, ItemColumns, prev.sortField, prev.sortDirection);
            return { ...prev, search: value, filtered: sorted, page: 1 };
          }),
        onSort: (key) =>
          setItemState((prev) => {
            const direction =
              prev.sortField === key && prev.sortDirection === "asc" ? "desc" : "asc";
            const sorted = applySorting(prev.filtered, ItemColumns, key, direction);
            return { ...prev, sortField: key, sortDirection: direction, filtered: sorted };
          }),
        onToggleColumn: (key) =>
          setItemState((prev) => {
            const next = new Set(prev.visibleColumns);
            if (next.has(key) && next.size > 1) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return { ...prev, visibleColumns: next };
          }),
        onChangePage: (page) => setItemState((prev) => ({ ...prev, page })),
        pageSize: PAGE_SIZE,
        totals: totals.items,
        renderActions: (item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyItemLink(item)}
            className="gap-2"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {itemState.lastCopiedId === item.id ? "Copied" : "Copy link"}
          </Button>
        ),
      })}
    </TabsContent>


  </Tabs>
);
}

