'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import NumericInput from '@/components/ui/numeric-input';
import { PaymentMethod, Currency, PAYMENT_METHOD_CATEGORIES } from '@/types/enums';
import { Trash2, Plus, DollarSign, Gift, Network, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { v4 as uuid } from 'uuid';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { getCompanyAreas, getPersonalAreas } from '@/lib/utils/business-structure-utils';

export interface SalePaymentLine {
  id: string;
  date: Date;
  amount: number;
  method: PaymentMethod;
  currency: Currency;
  notes?: string;
  
  // Exchange payment specific fields (when method = EXCHANGE)
  exchangeDescription?: string;
  exchangeCategory?: string;
}

interface SalePaymentsSubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payments: SalePaymentLine[]) => void;
  initialPayments?: SalePaymentLine[];
  totalDue?: number;
  mode?: 'payments' | 'other-methods';
  // Callbacks for Other Methods
  onGiftApplied?: (amount: number) => void;
  onExchangeApplied?: (description: string, value: number, category?: string) => void;
  onOtherMethodApplied?: (methodName: string, amount: number) => void;
}

export default function SalePaymentsSubModal({
  open,
  onOpenChange,
  onSave,
  initialPayments = [],
  totalDue = 0,
  mode = 'payments',
  onGiftApplied,
  onExchangeApplied,
  onOtherMethodApplied
}: SalePaymentsSubModalProps) {
  const [payments, setPayments] = useState<SalePaymentLine[]>([]);
  
  // Other payment methods state
  const [selectedMethod, setSelectedMethod] = useState<'gift' | 'exchange' | 'other' | null>(null);
  const [giftAmount, setGiftAmount] = useState<number>(0);
  const [exchangeDescription, setExchangeDescription] = useState<string>('');
  const [exchangeValue, setExchangeValue] = useState<number>(0);
  const [exchangeCategory, setExchangeCategory] = useState<string>('');
  const [otherMethodName, setOtherMethodName] = useState<string>('');
  const [otherMethodAmount, setOtherMethodAmount] = useState<number>(0);
  
  // Notes functionality
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setPayments(initialPayments.length > 0 ? initialPayments : [createEmptyPayment()]);
    }
  }, [open, initialPayments]);

  const createEmptyPayment = (): SalePaymentLine => ({
    id: uuid(),
    date: new Date(),
    amount: 0,
    method: PaymentMethod.FIAT_USD,
    currency: Currency.USD,
    notes: ''
  });

  const handleAmountChange = (paymentId: string, amount: number) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, amount } : p
    ));
  };

  const handleMethodChange = (paymentId: string, method: PaymentMethod) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, method } : p
    ));
  };

  const handleCurrencyChange = (paymentId: string, currency: Currency) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, currency } : p
    ));
  };

  const handleDateChange = (paymentId: string, date: Date) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, date } : p
    ));
  };

  const handleNotesChange = (paymentId: string, notes: string) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, notes } : p
    ));
  };

  const handleDeletePayment = (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const handleAddPayment = () => {
    setPayments(prev => [...prev, createEmptyPayment()]);
  };

  const handleAutoFillRemaining = () => {
    if (remaining <= 0) return;
    
    if (mode === 'other-methods' && selectedMethod) {
      // Auto fill for Other Methods
      switch (selectedMethod) {
        case 'gift':
          setGiftAmount(remaining);
          break;
        case 'exchange':
          setExchangeValue(remaining);
          break;
        case 'other':
          setOtherMethodAmount(remaining);
          break;
      }
    } else if (payments.length > 0) {
      // Auto fill for regular payments
      const lastPaymentIndex = payments.length - 1;
      handleAmountChange(payments[lastPaymentIndex].id, remaining);
    }
  };

  const handleSave = () => {
    if (mode === 'payments') {
      const validPayments = payments.filter(p => p.amount > 0);
      onSave(validPayments);
    } else {
      // Handle Other Methods - only process the selected method
      if (selectedMethod === 'gift' && giftAmount > 0 && onGiftApplied) {
        onGiftApplied(giftAmount);
      }
      if (selectedMethod === 'exchange' && (exchangeDescription || exchangeValue > 0) && onExchangeApplied) {
        onExchangeApplied(exchangeDescription, exchangeValue, exchangeCategory);
      }
      if (selectedMethod === 'other' && (otherMethodName || otherMethodAmount > 0) && onOtherMethodApplied) {
        onOtherMethodApplied(otherMethodName, otherMethodAmount);
      }
    }
    onOpenChange(false);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalDue - totalPaid;

  // Helper function to format numbers (0 decimals if whole, 1 decimal if not)
  const formatAmount = (amount: number): string => {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-full max-w-4xl max-h-[80vh] ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle>{mode === 'other-methods' ? 'Other Payment Methods' : 'Financial Record Payments'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          {mode === 'payments' ? (
            <>
              {/* Summary Bar */}
              {totalDue > 0 && (
                <div className="p-3 bg-muted/50 rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Total Due:</span>
                        <span className="text-lg font-bold">${formatAmount(totalDue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Total Paid:</span>
                        <span className={`text-lg font-bold ${totalPaid > 0 && totalPaid === totalDue ? 'text-green-600' : 'text-foreground'}`}>
                          ${formatAmount(totalPaid)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Remaining:</span>
                        <span className={`text-lg font-bold ${remaining > 0 ? 'text-orange-600' : 'text-white'}`}>
                          ${formatAmount(remaining)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillRemaining}
                      disabled={remaining <= 0 || (mode !== 'payments' && !selectedMethod)}
                      className="h-8 text-xs"
                    >
                      Auto
                    </Button>
                  </div>
                  
                  {/* Notes Section */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={showNotes ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowNotes(!showNotes)}
                        className="h-7 text-xs"
                      >
                        Notes
                      </Button>
                      {showNotes && (
                        <div className="flex-1">
                          <Input
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            placeholder="Add general notes for this payment record..."
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Currency</div>
                  <div className="col-span-3">Method</div>
                  <div className="col-span-1">Notes</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {payments.map((payment, index) => (
                  <div key={payment.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                    <div className="col-span-3">
                      <DatePicker
                        value={payment.date}
                        onChange={(date) => date && handleDateChange(payment.id, date)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <NumericInput
                        value={payment.amount}
                        onChange={(amount) => handleAmountChange(payment.id, amount)}
                        placeholder="0.00"
                        className={`h-8 text-xs ${PAYMENT_METHOD_CATEGORIES.SPECIAL.includes(payment.method as any) ? 'opacity-75' : ''}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={payment.currency}
                        onValueChange={(value) => handleCurrencyChange(payment.id, value as Currency)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Currency.USD}>USD</SelectItem>
                          <SelectItem value={Currency.CRC}>CRC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      {PAYMENT_METHOD_CATEGORIES.SPECIAL.includes(payment.method as any) ? (
                        // Show special methods as read-only with styling
                        <div className="h-8 px-3 py-1 bg-muted/50 border rounded-md flex items-center text-xs">
                          <span className="text-muted-foreground">{payment.method}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Other Method
                          </Badge>
                        </div>
                      ) : (
                        // Regular dropdown for regular payment methods
                        <Select
                          value={payment.method}
                          onValueChange={(value) => handleMethodChange(payment.id, value as PaymentMethod)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHOD_CATEGORIES.REGULAR.map((methodKey) => (
                              <SelectItem key={methodKey} value={PaymentMethod[methodKey as keyof typeof PaymentMethod]}>
                                {PaymentMethod[methodKey as keyof typeof PaymentMethod]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Input
                        value={payment.notes || ''}
                        onChange={(e) => handleNotesChange(payment.id, e.target.value)}
                        placeholder="Notes"
                        className={`h-8 text-xs ${PAYMENT_METHOD_CATEGORIES.SPECIAL.includes(payment.method as any) ? 'opacity-75' : ''}`}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPayment}
                  className="w-full h-8 text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Payment
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Other Payment Methods Header */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Available Revenue:</span>
                  <span className="text-lg font-bold">${formatAmount(totalDue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Select Method:</span>
                  <span className="text-sm font-medium">Gift, Exchange, or Other</span>
                </div>
              </div>

              {/* Other Payment Methods Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
                  <div className="col-span-3">Method</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-4">Details</div>
                  <div className="col-span-2">Actions</div>
                  <div className="col-span-1">Status</div>
                </div>

                {/* Gift Method Row */}
                <div 
                  className={`grid grid-cols-12 gap-2 items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'gift' 
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20' 
                      : 'hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/10'
                  } ${selectedMethod && selectedMethod !== 'gift' ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedMethod('gift')}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <Gift className={`h-4 w-4 ${selectedMethod === 'gift' ? 'text-pink-600' : 'text-pink-500'}`} />
                    <span className={`text-sm font-medium ${selectedMethod === 'gift' ? 'text-pink-700 dark:text-pink-300' : ''}`}>Gift</span>
                  </div>
                  <div className="col-span-2">
                    <NumericInput
                      value={giftAmount}
                      onChange={setGiftAmount}
                      placeholder="0.00"
                      className={`h-8 text-xs ${selectedMethod !== 'gift' ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                  <div className="col-span-4">
                    <span className="text-xs text-muted-foreground">Reduces revenue by gift amount</span>
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGiftAmount(totalDue);
                      }}
                      className="h-6 text-xs px-2"
                      disabled={selectedMethod !== 'gift'}
                    >
                      Auto
                    </Button>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {selectedMethod === 'gift' && giftAmount > 0 ? (
                      <span className="text-xs text-green-600">✓</span>
                    ) : selectedMethod === 'gift' ? (
                      <span className="text-xs text-pink-600">●</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* Exchange Method Row */}
                <div 
                  className={`grid grid-cols-12 gap-2 items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'exchange' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10'
                  } ${selectedMethod && selectedMethod !== 'exchange' ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedMethod('exchange')}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <Network className={`h-4 w-4 ${selectedMethod === 'exchange' ? 'text-blue-600' : 'text-blue-500'}`} />
                    <span className={`text-sm font-medium ${selectedMethod === 'exchange' ? 'text-blue-700 dark:text-blue-300' : ''}`}>Exchange</span>
                  </div>
                  <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                    <NumericInput
                      value={exchangeValue}
                      onChange={setExchangeValue}
                      placeholder="0.00"
                      className={`h-8 text-xs ${selectedMethod !== 'exchange' ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                  <div className="col-span-3" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={exchangeDescription}
                      onChange={(e) => setExchangeDescription(e.target.value)}
                      placeholder="What was exchanged for?"
                      className={`h-8 text-xs ${selectedMethod !== 'exchange' ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                  <div className="col-span-3" onClick={(e) => e.stopPropagation()}>
                    <SearchableSelect
                      value={exchangeCategory}
                      onValueChange={setExchangeCategory}
                      placeholder="Select Category"
                      options={[
                        ...getCompanyAreas().map(cat => ({ value: cat, label: cat, category: 'Company' })),
                        ...getPersonalAreas().map(cat => ({ value: cat, label: cat, category: 'Personal' }))
                      ]}
                      autoGroupByCategory={true}
                      className={`h-8 text-xs ${selectedMethod !== 'exchange' ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {selectedMethod === 'exchange' && (exchangeDescription || exchangeValue > 0) ? (
                      <span className="text-xs text-green-600">✓</span>
                    ) : selectedMethod === 'exchange' ? (
                      <span className="text-xs text-blue-600">●</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* Other Method Row */}
                <div 
                  className={`grid grid-cols-12 gap-2 items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                    selectedMethod === 'other' 
                      ? 'border-gray-500 bg-gray-50 dark:bg-gray-950/20' 
                      : 'hover:border-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-950/10'
                  } ${selectedMethod && selectedMethod !== 'other' ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedMethod('other')}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <Package className={`h-4 w-4 ${selectedMethod === 'other' ? 'text-gray-600' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${selectedMethod === 'other' ? 'text-gray-700 dark:text-gray-300' : ''}`}>Other</span>
                  </div>
                  <div className="col-span-2">
                    <NumericInput
                      value={otherMethodAmount}
                      onChange={setOtherMethodAmount}
                      placeholder="0.00"
                      className={`h-8 text-xs ${selectedMethod !== 'other' ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={otherMethodName}
                      onChange={(e) => setOtherMethodName(e.target.value)}
                      placeholder="Custom method name"
                      className="h-8 text-xs"
                      disabled={selectedMethod !== 'other'}
                    />
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <span className="text-xs text-muted-foreground">Custom payment method</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {selectedMethod === 'other' && (otherMethodName || otherMethodAmount > 0) ? (
                      <span className="text-xs text-green-600">✓</span>
                    ) : selectedMethod === 'other' ? (
                      <span className="text-xs text-gray-600">●</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Instructions:
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Click on a row</strong> to select your payment method</li>
                  <li>• <strong>Gift:</strong> Auto-fill from revenue, reduces total revenue by gift amount</li>
                  <li>• <strong>Exchange:</strong> Describe what was exchanged, sets category to &ldquo;Other Sales&rdquo;</li>
                  <li>• <strong>Other:</strong> Custom payment method with specified name and amount</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {mode === 'payments' 
              ? `${payments.filter(p => p.amount > 0).length} payment(s) recorded - Total: $${formatAmount(totalPaid)}`
              : selectedMethod 
                ? `Selected: ${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} method`
                : 'Select a payment method'
            }
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="h-8 text-xs"
              disabled={mode === 'other-methods' && !selectedMethod}
            >
              <DollarSign className="w-3 h-3 mr-1" />
              {mode === 'payments' ? 'Save Payments' : 'Apply Method'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
