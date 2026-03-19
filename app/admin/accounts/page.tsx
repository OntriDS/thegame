'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import AccountModal from '@/components/modals/account-modal';
import type { Account } from '@/types/entities';
import { User, Plus, Mail, Lock, Edit, Trash2 } from 'lucide-react';

export default function AccountsPage() {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const accountsData = await ClientAPI.getAccounts();
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('[Accounts Section] Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleUpdate = useCallback(() => {
    const now = Date.now();
    if (!isLoading) {
      loadAccounts();
    }
  }, [loadAccounts, isLoading]);

  useEntityUpdates('account', handleUpdate);

  const handleCreateAccount = useCallback(() => {
    setSelectedAccount(null);
    setShowAccountModal(true);
  }, []);

  const handleEditAccount = useCallback((account: Account) => {
    setSelectedAccount(account);
    setShowAccountModal(true);
  }, []);

  const handleDeleteAccount = useCallback(async (account: Account) => {
    try {
      await ClientAPI.deleteAccount(account.id);
      await loadAccounts();
    } catch (error) {
      console.error('[Accounts Section] Failed to delete account:', error);
    }
  }, [loadAccounts]);

  const getAccountStatus = (account: Account) => {
    if (account.isActive) {
      return (
        <span className="text-green-600">Active</span>
      );
    }
    return (
      <span className="text-red-600">Inactive</span>
    );
  };

  const getAccountType = (account: Account) => {
    // Check if account has a password (regular user account)
    if (account.passwordHash && account.passwordHash.length > 0) {
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-xs text-muted-foreground">Regular Account</span>
        </div>
      );
    }

    // Check if account uses passphrase (no password)
    if (!account.passwordHash || account.passwordHash.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span className="text-xs text-muted-foreground">Passphrase Account</span>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Accounts</h1>
          <Button onClick={handleCreateAccount} size="sm" variant="default" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading accounts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-blue-500/5 border-blue-500/20 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-600">Total Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-blue-600">{accounts.length}</div>
              <p className="text-[10px] font-bold text-blue-600/50 mt-1 uppercase tracking-tighter leading-none">Registered User Accounts</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-600">Active Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-emerald-600">{accounts.filter(a => a.isActive).length}</div>
              <p className="text-[10px] font-bold text-emerald-600/50 mt-1 uppercase tracking-tighter leading-none">Currently Active & Logged In</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/5 border-orange-500/20 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-orange-600">Passphrase Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-orange-600">{accounts.filter(a => !a.passwordHash || a.passwordHash.length === 0).length}</div>
              <p className="text-[10px] font-bold text-orange-600/50 mt-1 uppercase tracking-tighter leading-none">Uses System Passphrase</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Account Management
              </CardTitle>
              <CardDescription className="text-xs">
                Create and manage user accounts with email/password authentication
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-muted-foreground">No accounts found</div>
                <p className="text-sm">Create your first account to get started</p>
                <Button onClick={handleCreateAccount} className="mt-4">
                  Create First Account
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary/10">
                      <th className="py-4 font-bold uppercase tracking-widest text-[10px] opacity-50">Account</th>
                      <th className="py-4 font-bold uppercase tracking-widest text-[10px] opacity-50">Type</th>
                      <th className="py-4 font-bold uppercase tracking-widest text-[10px] opacity-50">Status</th>
                      <th className="py-4 font-bold uppercase tracking-widest text-[10px] opacity-50">Last Active</th>
                      <th className="py-4 font-bold uppercase tracking-widest text-[10px] opacity-50 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-primary/5">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-[10px] font-mono opacity-40">{account.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <div className="text-xs opacity-70">{account.email}</div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <div className="text-xs text-muted-foreground">
                              {account.passwordHash && account.passwordHash.length > 0 ? '••••••' : 'Not set'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          {getAccountStatus(account)}
                        </td>
                        <td className="py-4">
                          {account.lastActiveAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(account.lastActiveAt).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAccount(account)}
                              className="h-8 px-3"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteAccount(account)}
                              className="h-8 px-3 ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Modal */}
        <AccountModal
          account={selectedAccount}
          open={showAccountModal}
          onOpenChange={setShowAccountModal}
          onSave={async (account: Account) => {
            await ClientAPI.upsertAccount(account);
            await loadAccounts();
          }}
        />
      </div>
    </div>
  );
}