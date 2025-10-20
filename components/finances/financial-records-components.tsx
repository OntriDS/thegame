'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  onRecordEdit
}: { 
  year: number; 
  month: number; 
  onRecordUpdated: () => void;
  onRecordEdit: (record: FinancialRecord) => void;
}) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);

  useEffect(() => {
    const loadRecords = async () => {
      const companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
      setRecords(companyRecords);
    };
    loadRecords();
  }, [year, month]);

  // Listen for financial record updates to refresh the list
  useEffect(() => {
    const handleFinancialUpdate = () => {
      const loadRecords = async () => {
        const companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
        setRecords(companyRecords);
      };
      loadRecords();
    };

    window.addEventListener('financialsUpdated', handleFinancialUpdate);
    window.addEventListener('financialsCreated', handleFinancialUpdate);

    return () => {
      window.removeEventListener('financialsUpdated', handleFinancialUpdate);
      window.removeEventListener('financialsCreated', handleFinancialUpdate);
    };
  }, [year, month]);

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
  };

  return (
    <>
      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No company records for {formatMonthYear(new Date(year, month - 1))}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            // Payment status indicators
            const isWaiting = record.isNotPaid || record.isNotCharged;
            const waitingText = record.isNotPaid ? '⏳ Not Paid' : record.isNotCharged ? '⏳ Not Charged' : '';
            
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
                      <span className={record.cost > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {record.cost > 0 ? `-$${record.cost}` : '$0'}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className={record.revenue > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {record.revenue > 0 ? `+$${record.revenue}` : '$0'}
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
                      {record.rewards?.points && (record.rewards.points.hp || record.rewards.points.fp || record.rewards.points.rp || record.rewards.points.xp) && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs">
                            {record.rewards.points.hp ? `HP:${record.rewards.points.hp} ` : ''}
                            {record.rewards.points.fp ? `FP:${record.rewards.points.fp} ` : ''}
                            {record.rewards.points.rp ? `RP:${record.rewards.points.rp} ` : ''}
                            {record.rewards.points.xp ? `XP:${record.rewards.points.xp}` : ''}
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
              year={year}
              month={month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord) => {
                try {
                  // Parent only calls DataStore - Links System handles all relationships automatically
                  const finalRecord = await ClientAPI.upsertFinancialRecord(record);
                  
                  const companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
                  setRecords(companyRecords);
                  onRecordUpdated();
                  setRecordToEdit(null);
                  
                  // Dispatch events
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('financialsUpdated'));
                    window.dispatchEvent(new Event('linksUpdated'));
                  }
                } catch (error) {
                  console.error('Failed to save financial record:', error);
                }
              }}
              onDelete={async () => {
                const companyRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'company');
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
  onRecordEdit
}: { 
  year: number; 
  month: number; 
  onRecordUpdated: () => void;
  onRecordEdit: (record: FinancialRecord) => void;
}) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);

  useEffect(() => {
    const loadRecords = async () => {
      const personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
      setRecords(personalRecords);
    };
    loadRecords();
  }, [year, month]);

  // 🚨 FIX: Listen for financial record updates to refresh the list
  useEffect(() => {
    const handleFinancialUpdate = () => {
      const loadRecords = async () => {
        const personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
        setRecords(personalRecords);
      };
      loadRecords();
    };

    window.addEventListener('financialsUpdated', handleFinancialUpdate);
    window.addEventListener('financialsCreated', handleFinancialUpdate);

    return () => {
      window.removeEventListener('financialsUpdated', handleFinancialUpdate);
      window.removeEventListener('financialsCreated', handleFinancialUpdate);
    };
  }, [year, month]);

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
      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No personal records for {formatMonthYear(new Date(year, month - 1))}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            // Payment status indicators
            const isWaiting = record.isNotPaid || record.isNotCharged;
            const waitingText = record.isNotPaid ? '⏳ Not Paid' : record.isNotCharged ? '⏳ Not Charged' : '';
            
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
                      <span className={record.cost > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {record.cost > 0 ? `-$${record.cost}` : '$0'}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className={record.revenue > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {record.revenue > 0 ? `+$${record.revenue}` : '$0'}
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
                      {record.rewards?.points && (record.rewards.points.hp || record.rewards.points.fp || record.rewards.points.rp || record.rewards.points.xp) && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs">
                            {record.rewards.points.hp ? `HP:${record.rewards.points.hp} ` : ''}
                            {record.rewards.points.fp ? `FP:${record.rewards.points.fp} ` : ''}
                            {record.rewards.points.rp ? `RP:${record.rewards.points.rp} ` : ''}
                            {record.rewards.points.xp ? `XP:${record.rewards.points.xp}` : ''}
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
              year={year}
              month={month}
              open={!!recordToEdit}
              onOpenChange={(open: boolean) => !open && setRecordToEdit(null)}
              onSave={async (record: FinancialRecord) => {
                try {
                  // Parent only calls DataStore - Links System handles all relationships automatically
                  const finalRecord = await ClientAPI.upsertFinancialRecord(record);
                  
                  const personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
                  setRecords(personalRecords);
                  onRecordUpdated();
                  setRecordToEdit(null);
                  
                  // Dispatch events
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('financialsUpdated'));
                    window.dispatchEvent(new Event('linksUpdated'));
                  }
                } catch (error) {
                  console.error('Failed to save financial record:', error);
                }
              }}
              onDelete={async () => {
                const personalRecords = await ClientAPI.getFinancialRecordsByMonth(year, month, 'personal');
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