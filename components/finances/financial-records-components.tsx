'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import { FinancialRecord } from '@/types/entities';
import { formatMonthYear, reviveDates } from '@/lib/utils/date-utils';
import FinancialsModal from '@/components/modals/financials-modal';

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
      // Sort by creation date descending (newest first)
      companyRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecords(companyRecords);
    };
    loadRecords();
  }, [year, month]);

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
      companyRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecords(companyRecords);
    };
    loadRecords();
  });

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-xs text-muted-foreground">Loading company records...</p>
        </div>
      ) : records.length === 0 ? (
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

          {recordToEdit && (
            <FinancialsModal
              record={recordToEdit}
              year={recordToEdit.year ?? year}
              month={recordToEdit.month ?? month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord, force?: boolean) => {
                // Allow error to bubble up
                const finalRecord = await ClientAPI.upsertFinancialRecord(record, { force });

                const companyRecords = await ClientAPI.getFinancialRecordsByMonth(
                  finalRecord.year,
                  finalRecord.month,
                  'company'
                );
                setRecords(companyRecords);
                onRecordUpdated();
                setRecordToEdit(finalRecord);
              }}
              onDelete={async () => {
                const r = recordToEdit;
                const companyRecords = await ClientAPI.getFinancialRecordsByMonth(
                  r.year,
                  r.month,
                  'company'
                );
                setRecords(companyRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
            />
          )}
        </div>
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
      setRecords(personalRecords);
    };
    loadRecords();
  }, [year, month]);

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
      setRecords(personalRecords);
    };
    loadRecords();
  });

  // Note: Removed automatic modal opening behavior that was causing the bug
  // The modal should only open when explicitly triggered by user action

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
  };

  const handleDelete = async (record: FinancialRecord) => {
    const confirmed = confirm(`⚠️ PERMANENT DELETION

Are you sure you want to delete this record?

${record.name}
${record.station} • ${record.description}

This action cannot be undone.`);

    if (confirmed) {
      try {
        // Delete from DataStore (log cleanup handled by removeRecordEffectsOnDelete workflow)
        await ClientAPI.deleteFinancialRecord(record.id);

        // Update local state immediately
        const updatedRecords = records.filter(r => r.id !== record.id);
        setRecords(updatedRecords);

        // Trigger parent refresh
        onRecordUpdated();

      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record. Please try again.');
      }
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-xs text-muted-foreground">Loading personal records...</p>
        </div>
      ) : records.length === 0 ? (
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

          {recordToEdit && (
            <FinancialsModal
              record={recordToEdit}
              year={recordToEdit.year ?? year}
              month={recordToEdit.month ?? month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord, force?: boolean) => {
                // Allow error to bubble up
                const finalRecord = await ClientAPI.upsertFinancialRecord(record, { force });

                const personalRecords = await ClientAPI.getFinancialRecordsByMonth(
                  finalRecord.year,
                  finalRecord.month,
                  'personal'
                );
                setRecords(personalRecords);
                onRecordUpdated();
                setRecordToEdit(finalRecord);
              }}
              onDelete={async () => {
                const r = recordToEdit;
                const personalRecords = await ClientAPI.getFinancialRecordsByMonth(
                  r.year,
                  r.month,
                  'personal'
                );
                setRecords(personalRecords);
                onRecordUpdated();
                setRecordToEdit(null);
              }}
            />
          )}
        </div>
      )}
    </>
  );
}