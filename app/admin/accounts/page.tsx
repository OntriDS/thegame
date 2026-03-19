'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import AccountModal from '@/components/modals/account-modal';
import type { Account } from '@/types/entities';
import { User, Plus, Mail, Lock, Edit, Trash2 } from 'lucide-react';
import { CharacterRole } from '@/types/enums';

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

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      founder: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      team: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'ai-agent': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      developer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      player: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    };

    const colorClass = roleColors[role.toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

    return (
      <span key={role} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${colorClass}`}>
        {role}
      </span>
    );
  };

  const getAccountStatus = (account: any) => {
    if (account.isActive) {
      return (
        <span className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase tracking-widest opacity-50">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Inactive
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Accounts</h1>
          <Button onClick={handleCreateAccount} size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold uppercase tracking-widest opacity-50">Synchronizing Identity Layer...</div>
        </div>
      </div>
    );
  }

  // Calculate role stats
  const roleStats = {
    founder: accounts.filter(a => a.character?.roles?.includes(CharacterRole.FOUNDER)).length,
    team: accounts.filter(a => a.character?.roles?.includes(CharacterRole.TEAM)).length,
    agent: accounts.filter(a => (a as any).type === 'm2m' || a.character?.roles?.includes(CharacterRole.AI_AGENT)).length,
    player: accounts.filter(a => a.character?.roles?.includes(CharacterRole.PLAYER)).length,
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tightest leading-none">Identity Layer</h1>
          <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-50">Account & Character Management</p>
        </div>
        <Button onClick={handleCreateAccount} size="lg" className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          <Plus className="h-5 w-5 mr-2 stroke-[3px]" />
          Create Identity
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-indigo-500/5 border-indigo-500/10 shadow-sm overflow-hidden group">
          <CardContent className="p-4 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/50 mb-1">Founders</div>
            <div className="text-3xl font-black text-indigo-600">{roleStats.founder}</div>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-sm overflow-hidden group">
          <CardContent className="p-4 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Team Members</div>
            <div className="text-3xl font-black text-emerald-600">{roleStats.team}</div>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/10 shadow-sm overflow-hidden group">
          <CardContent className="p-4 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/50 mb-1">AI Agents</div>
            <div className="text-3xl font-black text-amber-600">{roleStats.agent}</div>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="h-8 w-8 font-black text-2xl">AI</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-violet-500/5 border-violet-500/10 shadow-sm overflow-hidden group">
          <CardContent className="p-4 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-violet-500/50 mb-1">Players</div>
            <div className="text-3xl font-black text-violet-600">{roleStats.player}</div>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="h-8 w-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary/10 bg-muted/30">
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Identity</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Email / System ID</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Roles</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Status</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {accounts.map((account: any) => (
                  <tr key={account.id} className="group hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xl shadow-inner ${account.type === 'm2m' ? 'bg-amber-500/20 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                          {account.type === 'm2m' ? '🤖' : account.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-tighter text-base leading-none group-hover:text-primary transition-colors">{account.name}</div>
                          <div className="text-[10px] font-bold opacity-30 mt-1 font-mono">{account.id}</div>
                        </div>
                        {account.type === 'm2m' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white uppercase tracking-widest ml-1">M2M</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">{account.email}</div>
                        {account.phone && <div className="text-[10px] opacity-40">{account.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {account.character?.roles?.map((role: string) => getRoleBadge(role)) || 
                         (account.type !== 'm2m' && <span className="text-[10px] opacity-30 italic font-bold">No Character Linked</span>)}
                      </div>
                    </td>
                    <td className="p-4">
                      {getAccountStatus(account)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {account.type !== 'm2m' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAccount(account)}
                              className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-all active:scale-90"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAccount(account)}
                              className="h-8 w-8 p-0 text-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {account.type === 'm2m' && (
                          <div className="text-[10px] font-black text-amber-500/50 mr-2 uppercase tracking-widest italic">System Managed</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  );
}