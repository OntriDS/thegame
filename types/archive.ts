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

