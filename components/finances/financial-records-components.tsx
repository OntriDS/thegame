'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientAPI } from '@/lib/client-api';
import { FinancialRecord } from '@/types/entities';
import { formatMonthYear, reviveDates } from '@/lib/utils/date-utils';
import FinancialsModal from '@/components/modals/financials-modal';
import { ArrowUpDown } from 'lucide-react';

export type FinancialSortOption =
  | 'date-newest'
  | 'date-oldest'
  | 'name-asc'
  | 'name-desc'
  | 'station-asc'
  | 'station-desc'
  | 'profit-high'
  | 'profit-low';

// Sort financial records by selected criteria
const sortFinancialRecords = (records: FinancialRecord[], sortOption: FinancialSortOption): FinancialRecord[] => {
  const sortedRecords = [...records];

  switch (sortOption) {
    case 'date-newest':
      return sortedRecords.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

    case 'date-oldest':
      return sortedRecords.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });

    case 'name-asc':
      return sortedRecords.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case 'name-desc':
      return sortedRecords.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameB.localeCompare(nameA);
      });

    case 'station-asc':
      return sortedRecords.sort((a, b) => {
        const stationA = (a.station || '').toLowerCase();
        const stationB = (b.station || '').toLowerCase();
        return stationA.localeCompare(stationB);
      });

    case 'station-desc':
      return sortedRecords.sort((a, b) => {
        const stationA = (a.station || '').toLowerCase();
        const stationB = (b.station || '').toLowerCase();
        return stationB.localeCompare(stationA);
      });

    case 'profit-high':
      return sortedRecords.sort((a, b) => {
        const profitA = (a.revenue || 0) - (a.cost || 0);
        const profitB = (b.revenue || 0) - (b.cost || 0);
        return profitB - profitA;
      });

    case 'profit-low':
      return sortedRecords.sort((a, b) => {
        const profitA = (a.revenue || 0) - (a.cost || 0);
        const profitB = (b.revenue || 0) - (b.cost || 0);
        return profitA - profitB;
      });

    default:
      return sortedRecords;
  }
};

// Company Records List Component
export function CompanyRecordsList({
  year,
  month,
  onRecordUpdated,
  onRecordEdit,
  isLoading = false,
  deepLinkRecord,
  onDeepLinkRecordConsumed,
}: {
  year: number;
  month: number;
  onRecordUpdated: () => void;
  onRecordEdit: (record: FinancialRecord) => void;
  isLoading?: boolean;
  deepLinkRecord?: FinancialRecord | null;
  onDeepLinkRecordConsumed?: () => void;
}) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);
  const [sortOption, setSortOption] = useState<FinancialSortOption>('date-newest');

  useEffect(() => {
    if (!deepLinkRecord || deepLinkRecord.type !== 'company') return;
    setRecordToEdit(deepLinkRecord);
    onDeepLinkRecordConsumed?.();
  }, [deepLinkRecord, onDeepLinkRecordConsumed]);

  useEffect(() => {
    const loadRecords = async () => {
      let companyRecords: FinancialRecord[];
      if (year === 0 || month === 0) {
        const allRecords = await ClientAPI.getFinancialRecords();
        companyRecords = allRecords.filter(r => r.type === 'company');
      } else {
        companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
      }
      // Apply sorting
      const sortedRecords = sortFinancialRecords(companyRecords, sortOption);
      setRecords(sortedRecords);
    };
    loadRecords();
  }, [year, month, sortOption]);

  // Listen for financial record updates to refresh the list
  useEntityUpdates('financial', () => {
    const loadRecords = async () => {
      let companyRecords: FinancialRecord[];
      if (year === 0 || month === 0) {
        const allRecords = await ClientAPI.getFinancialRecords();
        companyRecords = allRecords.filter(r => r.type === 'company');
      } else {
        companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
      }
      // Apply sorting
      const sortedRecords = sortFinancialRecords(companyRecords, sortOption);
      setRecords(sortedRecords);
    };
    loadRecords();
  });

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
    onRecordEdit(record);
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-xs text-muted-foreground">Loading company records...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortOption} onValueChange={(value: FinancialSortOption) => setSortOption(value)}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-newest">Date: Newest First</SelectItem>
                  <SelectItem value="date-oldest">Date: Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  <SelectItem value="station-asc">Station: A-Z</SelectItem>
                  <SelectItem value="station-desc">Station: Z-A</SelectItem>
                  <SelectItem value="profit-high">Profit: Highest First</SelectItem>
                  <SelectItem value="profit-low">Profit: Lowest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {records.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {year === 0 || month === 0
                    ? 'No company records'
                    : `No company records for ${formatMonthYear(new Date(year, month - 1))}`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {records.map(record => {
                // Payment status indicators
                const isWaiting = record.isNotPaid || record.isNotCharged;
                const waitingText = record.isNotPaid ? '⏳ Not Paid' : record.isNotCharged ? '⏳ Not Charged' : '';
                const cost = record.cost || 0;
                const revenue = record.revenue || 0;
                const profit = revenue - cost;

                return (
                  <Card key={record.id} className={isWaiting ? "border-orange-500/50 bg-orange-500/5" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        {/* Single row - compact display */}
                        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                          <span className="font-medium truncate">{record.name}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-xs">{record.station}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground font-medium">
                            {`Cost: $${cost}`}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={revenue > 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {`Rev: $${revenue}`}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={profit >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                            {`Profit: $${profit}`}
                          </span>
                          {isWaiting && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-orange-600 text-xs font-medium">{waitingText}</span>
                            </>
                          )}
                          {record.outputItemName && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs">
                                {record.outputItemName}
                                {record.outputQuantity && record.outputQuantity > 1 && ` (${record.outputQuantity}x)`}
                              </span>
                            </>
                          )}
                          {record.jungleCoins > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-blue-600 text-xs">J$: {record.jungleCoins}</span>
                            </>
                          )}
                        </div>

                        {/* Edit button */}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {recordToEdit && (
            <FinancialsModal
              record={recordToEdit}
              year={recordToEdit.year ?? year}
              month={recordToEdit.month ?? month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord, force?: boolean) => {
                const finalRecord = await ClientAPI.upsertFinancialRecord(record, { force });
                let companyRecords: FinancialRecord[];

                if (year === 0 || month === 0) {
                  const allRecords = await ClientAPI.getFinancialRecords();
                  companyRecords = allRecords.filter(r => r.type === 'company');
                } else {
                  companyRecords = await ClientAPI.getFinancialRecordsByMonth(finalRecord.year, finalRecord.month, 'company');
                }
                // Apply sorting
                const sortedRecords = sortFinancialRecords(companyRecords, sortOption);
                setRecords(sortedRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
              onDelete={async () => {
                if (!recordToEdit) return;

                await ClientAPI.deleteFinancialRecord(recordToEdit.id);
                const refreshedRecords = records.filter(r => r.id !== recordToEdit.id);
                setRecords(refreshedRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
            />
          )}
        </>
      )}
    </>
  );
}

// Personal Records List Component
export function PersonalRecordsList({
  year,
  month,
  onRecordUpdated,
  onRecordEdit,
  isLoading = false,
  deepLinkRecord,
  onDeepLinkRecordConsumed,
}: {
  year: number;
  month: number;
  onRecordUpdated: () => void;
  onRecordEdit: (record: FinancialRecord) => void;
  isLoading?: boolean;
  deepLinkRecord?: FinancialRecord | null;
  onDeepLinkRecordConsumed?: () => void;
}) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);
  const [sortOption, setSortOption] = useState<FinancialSortOption>('date-newest');

  useEffect(() => {
    if (!deepLinkRecord || deepLinkRecord.type !== 'personal') return;
    setRecordToEdit(deepLinkRecord);
    onDeepLinkRecordConsumed?.();
  }, [deepLinkRecord, onDeepLinkRecordConsumed]);

  useEffect(() => {
    const loadRecords = async () => {
      let personalRecords: FinancialRecord[];
      if (year === 0 || month === 0) {
        const allRecords = await ClientAPI.getFinancialRecords();
        personalRecords = allRecords.filter(r => r.type === 'personal');
      } else {
        personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
      }
      // Apply sorting
      const sortedRecords = sortFinancialRecords(personalRecords, sortOption);
      setRecords(sortedRecords);
    };
    loadRecords();
  }, [year, month, sortOption]);

  // 🚨 FIX: Listen for financial record updates to refresh the list
  useEntityUpdates('financial', () => {
    const loadRecords = async () => {
      let personalRecords: FinancialRecord[];
      if (year === 0 || month === 0) {
        const allRecords = await ClientAPI.getFinancialRecords();
        personalRecords = allRecords.filter(r => r.type === 'personal');
      } else {
        personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
      }
      // Apply sorting
      const sortedRecords = sortFinancialRecords(personalRecords, sortOption);
      setRecords(sortedRecords);
    };
    loadRecords();
  });

  // Note: Removed automatic modal opening behavior that was causing the bug
  // The modal should only open when explicitly triggered by user action

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
    onRecordEdit(record);
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-xs text-muted-foreground">Loading personal records...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortOption} onValueChange={(value: FinancialSortOption) => setSortOption(value)}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-newest">Date: Newest First</SelectItem>
                  <SelectItem value="date-oldest">Date: Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  <SelectItem value="station-asc">Station: A-Z</SelectItem>
                  <SelectItem value="station-desc">Station: Z-A</SelectItem>
                  <SelectItem value="profit-high">Profit: Highest First</SelectItem>
                  <SelectItem value="profit-low">Profit: Lowest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {records.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {year === 0 || month === 0
                    ? 'No personal records'
                    : `No personal records for ${formatMonthYear(new Date(year, month - 1))}`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {records.map(record => {
                // Payment status indicators
                const isWaiting = record.isNotPaid || record.isNotCharged;
                const waitingText = record.isNotPaid ? '⏳ Not Paid' : record.isNotCharged ? '⏳ Not Charged' : '';
                const cost = record.cost || 0;
                const revenue = record.revenue || 0;
                const profit = revenue - cost;

                return (
                  <Card key={record.id} className={isWaiting ? "border-orange-500/50 bg-orange-500/5" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        {/* Single row - compact display */}
                        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                          <span className="font-medium truncate">{record.name}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-xs">{record.station}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground font-medium">
                            {`Cost: $${cost}`}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={revenue > 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {`Rev: $${revenue}`}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={profit >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                            {`Profit: $${profit}`}
                          </span>
                          {isWaiting && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-orange-600 text-xs font-medium">{waitingText}</span>
                            </>
                          )}
                          {record.outputItemName && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs">
                                {record.outputItemName}
                                {record.outputQuantity && record.outputQuantity > 1 && ` (${record.outputQuantity}x)`}
                              </span>
                            </>
                          )}
                          {record.jungleCoins > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-blue-600 text-xs">J$: {record.jungleCoins}</span>
                            </>
                          )}
                        </div>

                        {/* Edit button */}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {recordToEdit && (
            <FinancialsModal
              record={recordToEdit}
              year={recordToEdit.year ?? year}
              month={recordToEdit.month ?? month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord, force?: boolean) => {
                const finalRecord = await ClientAPI.upsertFinancialRecord(record, { force });
                let personalRecords: FinancialRecord[];

                if (year === 0 || month === 0) {
                  const allRecords = await ClientAPI.getFinancialRecords();
                  personalRecords = allRecords.filter(r => r.type === 'personal');
                } else {
                  personalRecords = await ClientAPI.getFinancialRecordsByMonth(finalRecord.year, finalRecord.month, 'personal');
                }
                // Apply sorting
                const sortedRecords = sortFinancialRecords(personalRecords, sortOption);
                setRecords(sortedRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
              onDelete={async () => {
                if (!recordToEdit) return;

                await ClientAPI.deleteFinancialRecord(recordToEdit.id);
                const refreshedRecords = records.filter(r => r.id !== recordToEdit.id);
                setRecords(refreshedRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
            />
          )}
        </>
      )}
    </>
  );
}