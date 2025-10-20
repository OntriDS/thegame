'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import { ClientAPI } from "@/lib/client-api";
import { Sale } from "@/types/entities";
import { SaleType, SaleStatus } from "@/types/enums";
import { formatDateDDMMYYYY } from "@/lib/constants/date-constants";
import { getAllSiteNames } from "@/lib/utils/site-migration-utils";
import { Plus, Calendar, DollarSign, Package, TrendingUp } from "lucide-react";
import SalesModal from "@/components/modals/sales-modal";

export default function SalesPage() {
  const { activeBg } = useThemeColors();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [selectedType, setSelectedType] = useState<SaleType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<SaleStatus | 'all'>('all');
  const [selectedSite, setSelectedSite] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Load sales data
  useEffect(() => {
    loadSales();
  }, []);

  // Filter sales based on selected criteria
  useEffect(() => {
    let filtered = sales;

    if (selectedType !== 'all') {
      filtered = filtered.filter(sale => sale.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(sale => sale.status === selectedStatus);
    }

    if (selectedSite !== 'all') {
      filtered = filtered.filter(sale => sale.siteId === selectedSite);
    }

    setFilteredSales(filtered);
  }, [sales, selectedType, selectedStatus, selectedSite]);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const salesData = await ClientAPI.getSales();
      setSales(salesData);
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: SaleStatus) => {
    const statusColors = {
      [SaleStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [SaleStatus.ON_HOLD]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [SaleStatus.CHARGED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [SaleStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <Badge className={statusColors[status]}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: SaleType) => {
    const typeColors = {
      [SaleType.FERIA]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      [SaleType.DIRECT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      [SaleType.CONSIGNMENT]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      [SaleType.BUNDLE_SALE]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      [SaleType.ONLINE]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      [SaleType.NFT]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };

    return (
      <Badge className={typeColors[type]}>
        {type}
      </Badge>
    );
  };

  const calculateTotalRevenue = () => {
    return filteredSales.reduce((total, sale) => total + sale.totals.totalRevenue, 0);
  };

  const calculateTotalItems = () => {
    return filteredSales.reduce((total, sale) => {
      return total + sale.lines.reduce((lineTotal, line) => {
        if (line.kind === 'item' || line.kind === 'bundle') {
          return lineTotal + line.quantity;
        }
    return lineTotal;
    }, 0);
  }, 0);
  };

  const handleNewSale = () => {
    setEditingSale(null);
    setShowSalesModal(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSalesModal(true);
  };

  const handleSaveSale = async (sale: Sale) => {
    try {
      await ClientAPI.upsertSale(sale);
      
      setShowSalesModal(false);
      setEditingSale(null);
      await loadSales(); // Refresh the list
      
      // Dispatch events for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('salesUpdated'));
        window.dispatchEvent(new Event('linksUpdated'));
      }
    } catch (error) {
      console.error('Failed to save sale:', error);
      alert('Failed to save sale. Please try again.');
    }
  };

  const handleDeleteSale = async () => {
    try {
      await loadSales(); // Refresh the list after deletion
    } catch (error) {
      console.error('Failed to refresh sales after deletion:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Management</h1>
          <p className="text-muted-foreground">
            Track sales performance, analyze trends, and manage transactions
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleNewSale}>
          <Plus className="h-4 w-4" />
          New Sale
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-muted-foreground">
              {sales.length} total sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${calculateTotalRevenue().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From filtered sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateTotalItems()}</div>
            <p className="text-xs text-muted-foreground">
              Items and bundles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredSales.length > 0 ? (calculateTotalRevenue() / filteredSales.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as SaleType | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(SaleType).map(type => (
                    <SelectItem key={type} value={type as string}>{type as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as SaleStatus | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.values(SaleStatus).map(status => (
                    <SelectItem key={status} value={status as string}>{status as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Site:</span>
              <Select value={selectedSite} onValueChange={(value) => setSelectedSite(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {getAllSiteNames().map(site => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Sales List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleEditSale(sale)}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{sale.name}</h3>
                        {getTypeBadge(sale.type)}
                        {getStatusBadge(sale.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Date: {formatDateDDMMYYYY(new Date(sale.saleDate))}</p>
                        <p>Site: {sale.siteId}</p>
                        {sale.counterpartyName && <p>Client: {sale.counterpartyName}</p>}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold">${sale.totals.totalRevenue.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.lines.length} line{sale.lines.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Modal */}
      <SalesModal
        sale={editingSale}
        open={showSalesModal}
        onOpenChange={setShowSalesModal}
        onSave={handleSaveSale}
        onDelete={handleDeleteSale}
      />
    </div>
  );
}