'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import AccountModal from '@/components/modals/account-modal';
import DeleteModal from '@/components/modals/submodals/delete-submodal';
import ConfirmationModal from '@/components/modals/submodals/confirmation-submodal';
import type { Account } from '@/types/entities';
import { User, Plus, Edit, Trash2, Shield, UserRoundX, ArrowUpDown } from 'lucide-react';
import { CharacterRole, EntityType } from '@/types/enums';
import { AccountsDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';
import { filterRolesToSpecialOnly, normalizeCharacterRole } from '@/lib/character-roles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function AccountsPageContent({ canAccessIAMConsole, isCheckingIAMConsole }: { canAccessIAMConsole: boolean; isCheckingIAMConsole: boolean; }) {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountPendingDelete, setAccountPendingDelete] = useState<Account | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [accountPendingDisable, setAccountPendingDisable] = useState<Account | null>(null);
  const [showDisableAccountConfirm, setShowDisableAccountConfirm] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountSortOption, setAccountSortOption] = useState<
    'name-asc' | 'name-desc' | 'email-asc' | 'email-desc' | 'roles-asc' | 'roles-desc' | 'date-newest' | 'date-oldest'
  >('name-asc');

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

  const handleAccountDeepLink = useCallback(
    (account: Account) => {
      handleEditAccount(account);
    },
    [handleEditAccount],
  );

  const isFounderAccount = useCallback((account: Account) => {
    return (account.character?.roles || []).some((role) => normalizeCharacterRole(role) === CharacterRole.FOUNDER);
  }, []);

  const openDeleteAccountConfirm = useCallback((account: Account) => {
    if (isFounderAccount(account)) return;
    setAccountPendingDelete(account);
    setShowDeleteAccountModal(true);
  }, [isFounderAccount]);

  const handleDeleteAccountModalOpenChange = useCallback((open: boolean) => {
    setShowDeleteAccountModal(open);
    if (!open) {
      setAccountPendingDelete(null);
    }
  }, []);

  const openDisableAccountConfirm = useCallback((account: Account) => {
    setAccountPendingDisable(account);
    setShowDisableAccountConfirm(true);
  }, []);

  const handleDisableAccountModalOpenChange = useCallback((open: boolean) => {
    setShowDisableAccountConfirm(open);
    if (!open) {
      setAccountPendingDisable(null);
    }
  }, []);

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      founder: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      team: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'ai-agent': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      m2m: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      developer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      player: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
      customer: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      beneficiary: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      apprentice: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
      family: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
      investor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      partner: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };

    const colorClass = roleColors[role.toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

    return (
      <span key={role} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${colorClass}`}>
        {role}
      </span>
    );
  };

  const getAccountStatus = (account: any) => {
    if (account.type === 'm2m') {
      return (
        <span className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          M2M
        </span>
      );
    }
    const active = account.isActive !== false;
    if (active) {
      return (
        <span className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Inactive
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-1xl font-white uppercase tracking-tighter">Accounts</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/iam"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 font-bold uppercase tracking-widest"
            >
              <Shield className="h-4 w-4 mr-2" />
              IAM Console
            </Link>
            <Button onClick={handleCreateAccount} size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold uppercase tracking-widest opacity-50">Loading Accounts...</div>
        </div>
      </div>
    );
  }

  // Calculate role stats
  const hasCharacterRole = (roles: string[] | undefined, role: CharacterRole) =>
    roles?.some((r) => normalizeCharacterRole(r) === role) ?? false;

  const specialRoleOrder: CharacterRole[] = [
    CharacterRole.FOUNDER,
    CharacterRole.PLAYER,
    CharacterRole.TEAM,
    CharacterRole.APPRENTICE,
    CharacterRole.PARTNER,
    CharacterRole.AI_AGENT,
    CharacterRole.CUSTOMER,
    CharacterRole.BENEFICIARY,
    CharacterRole.FAMILY,
    CharacterRole.INVESTOR
  ];

  const specialRoleMeta: Record<CharacterRole | string, {
    title: string;
    classes: string;
    labelColor: string;
    valueColor: string;
    iconColor: string;
  }> = {
    [CharacterRole.FOUNDER]: {
      title: 'Founders',
      classes: 'bg-indigo-500/5 border-indigo-500/10',
      labelColor: 'text-indigo-500/50',
      valueColor: 'text-indigo-600',
      iconColor: 'text-indigo-600',
    },
    [CharacterRole.TEAM]: {
      title: 'Team Members',
      classes: 'bg-emerald-500/5 border-emerald-500/10',
      labelColor: 'text-emerald-500/50',
      valueColor: 'text-emerald-600',
      iconColor: 'text-emerald-600',
    },
    [CharacterRole.AI_AGENT]: {
      title: 'AI Agents',
      classes: 'bg-amber-500/5 border-amber-500/10',
      labelColor: 'text-amber-500/50',
      valueColor: 'text-amber-600',
      iconColor: 'text-amber-600',
    },
    [CharacterRole.CUSTOMER]: {
      title: 'Customers',
      classes: 'bg-sky-500/5 border-sky-500/10',
      labelColor: 'text-sky-500/50',
      valueColor: 'text-sky-600',
      iconColor: 'text-sky-600',
    },
    [CharacterRole.PLAYER]: {
      title: 'Players',
      classes: 'bg-violet-500/5 border-violet-500/10',
      labelColor: 'text-violet-500/50',
      valueColor: 'text-violet-600',
      iconColor: 'text-violet-600',
    },
    [CharacterRole.BENEFICIARY]: {
      title: 'Beneficiaries',
      classes: 'bg-cyan-500/5 border-cyan-500/10',
      labelColor: 'text-cyan-500/50',
      valueColor: 'text-cyan-600',
      iconColor: 'text-cyan-600',
    },
    [CharacterRole.APPRENTICE]: {
      title: 'Apprentices',
      classes: 'bg-lime-500/5 border-lime-500/10',
      labelColor: 'text-lime-500/50',
      valueColor: 'text-lime-600',
      iconColor: 'text-lime-600',
    },
    [CharacterRole.FAMILY]: {
      title: 'Family',
      classes: 'bg-fuchsia-500/5 border-fuchsia-500/10',
      labelColor: 'text-fuchsia-500/50',
      valueColor: 'text-fuchsia-600',
      iconColor: 'text-fuchsia-600',
    },
    [CharacterRole.INVESTOR]: {
      title: 'Investors',
      classes: 'bg-rose-500/5 border-rose-500/10',
      labelColor: 'text-rose-500/50',
      valueColor: 'text-rose-600',
      iconColor: 'text-rose-600',
    },
    [CharacterRole.PARTNER]: {
      title: 'Partners',
      classes: 'bg-purple-500/5 border-purple-500/10',
      labelColor: 'text-purple-500/50',
      valueColor: 'text-purple-600',
      iconColor: 'text-purple-600',
    },
  };

  const topRowCards = [
    ...specialRoleOrder.map((role) => ({
      id: role,
      title: specialRoleMeta[role].title,
      labelColor: specialRoleMeta[role].labelColor,
      count: accounts.filter(
        (account) => (account as any).type !== 'm2m' && hasCharacterRole(account.character?.roles, role)
      ).length,
      classes: specialRoleMeta[role].classes,
      valueColor: specialRoleMeta[role].valueColor,
      iconColor: specialRoleMeta[role].iconColor,
    })),
    {
      id: 'm2m',
      title: 'M2M',
      labelColor: 'text-orange-500/50',
      count: accounts.filter((account) => (account as any).type === 'm2m').length,
      classes: 'bg-orange-500/5 border-orange-500/10',
      valueColor: 'text-orange-600',
      iconColor: 'text-orange-600',
    },
  ];

  const getSpecialRolesForAccount = (account: Account) =>
    (account as any).type === 'm2m'
      ? ['m2m']
      : filterRolesToSpecialOnly(account.character?.roles);

  const getAccountSortValue = (account: Account, option: typeof accountSortOption): string | number => {
    switch (option) {
      case 'name-asc':
      case 'name-desc':
        return (account.name || '').toLowerCase();
      case 'email-asc':
      case 'email-desc':
        return (account.email || '').toLowerCase();
      case 'roles-asc':
      case 'roles-desc': {
        const roles = getSpecialRolesForAccount(account);
        return roles.map((role) => String(role).toLowerCase()).sort().join(', ');
      }
      case 'date-newest':
      case 'date-oldest': {
        const created = new Date(account.createdAt || 0).getTime();
        return Number.isNaN(created) ? 0 : created;
      }
      default:
        return '';
    }
  };

  const sortedAccounts = (() => {
    const sorted = [...accounts];
    sorted.sort((a, b) => {
      const left = getAccountSortValue(a, accountSortOption);
      const right = getAccountSortValue(b, accountSortOption);

      if (typeof left === 'number' && typeof right === 'number') {
        return accountSortOption === 'date-newest'
          ? right - left
          : accountSortOption === 'date-oldest'
            ? left - right
            : left - right;
      }

      const leftText = String(left);
      const rightText = String(right);
      return accountSortOption.endsWith('asc')
        ? leftText.localeCompare(rightText)
        : rightText.localeCompare(leftText);
    });
    return sorted;
  })();

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <AccountsDeepLinkTrigger onAccount={handleAccountDeepLink} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-1xl font-black uppercase tracking-tightest leading-none text-white drop-shadow-sm">Accounts</h1>
          <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-50">System Identity & Access Management</p>
        </div>
        <div className="flex items-center gap-2">
          {canAccessIAMConsole ? (
            <Link
              href="/admin/iam"
              className="inline-flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-widest transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 shadow-sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              IAM Console
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="inline-flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-widest transition-colors border border-muted text-muted-foreground h-9 px-4 shadow-sm opacity-50 cursor-not-allowed"
            >
              <Shield className="h-4 w-4 mr-2" />
              {isCheckingIAMConsole ? 'Checking access…' : 'IAM Console'}
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select
              value={accountSortOption}
              onValueChange={(value) => setAccountSortOption(value as typeof accountSortOption)}
            >
              <SelectTrigger className="w-44 h-8 md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
                <SelectItem value="email-asc">Email: A-Z</SelectItem>
                <SelectItem value="email-desc">Email: Z-A</SelectItem>
                <SelectItem value="roles-asc">Roles: A-Z</SelectItem>
                <SelectItem value="roles-desc">Roles: Z-A</SelectItem>
                <SelectItem value="date-newest">Date Created: Newest First</SelectItem>
                <SelectItem value="date-oldest">Date Created: Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateAccount} size="sm" className="bg-primary hover:bg-primary/90 font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 px-6">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-3">
        {topRowCards.map((card) => (
          <Card
            key={card.id}
            className={`${card.classes} shadow-sm overflow-hidden group`}
          >
            <CardContent className="p-4 relative">
              <div className={`text-[9px] font-black uppercase tracking-wider ${card.labelColor} mb-1`}>
                {card.title}
              </div>
              <div className={`text-2xl font-black ${card.valueColor}`}>{card.count}</div>
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <User className={`h-7 w-7 ${card.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts Table */}
      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-0">
          <div className="flex items-center border-b border-primary/10 bg-muted/30 px-4 py-3">
            <div className="text-xs font-black uppercase tracking-wider opacity-50">Accounts</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary/10 bg-muted/30">
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Account</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Email / System ID</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50 text-center">Roles</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Status</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] opacity-50 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {sortedAccounts.map((account: any) => {
                  const isFounder = isFounderAccount(account);
                  return (
                    <tr
                      key={account.id}
                      className={`group hover:bg-primary/5 transition-colors ${
                        account.type !== 'm2m' && account.isActive === false ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-black uppercase tracking-tighter text-base leading-none group-hover:text-primary transition-colors flex items-center gap-2">
                              {account.name}
                              {account.type === 'm2m' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white uppercase tracking-widest">M2M</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">{account.email}</div>
                          {account.phone && <div className="text-[10px] opacity-40">{account.phone}</div>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap justify-center gap-1">
                          {getSpecialRolesForAccount(account).length > 0 ? (
                            getSpecialRolesForAccount(account).map((role) => getRoleBadge(role))
                          ) : (
                            <span className="text-[10px] opacity-30 italic font-bold text-destructive">No special role</span>
                          )}
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
                                aria-label={`Edit account ${account.email}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {account.isActive !== false && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDisableAccountConfirm(account)}
                                  className="h-8 w-8 p-0 text-amber-600/70 hover:bg-amber-500/10 hover:text-amber-600 transition-all active:scale-90"
                                  title="Disable login (record stays as Inactive)"
                                  aria-label={`Disable account ${account.email}`}
                                >
                                  <UserRoundX className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteAccountConfirm(account)}
                                disabled={isFounder}
                                className={`h-8 w-8 p-0 transition-all active:scale-90 ${
                                  isFounder
                                    ? 'text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50 cursor-not-allowed'
                                    : 'text-destructive/50 hover:bg-destructive/10 hover:text-destructive'
                                }`}
                                title={isFounder ? 'Founder account cannot be deleted' : 'Permanently remove IAM row and keys'}
                                aria-label={`Permanently delete account ${account.email}`}
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
                  );
                })}

                {sortedAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <User className="h-12 w-12" />
                        <div className="font-black uppercase tracking-widest text-sm">No Accounts Found</div>
                      </div>
                    </td>
                  </tr>
                )}
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

      {accountPendingDelete && (
        <DeleteModal
          open={showDeleteAccountModal}
          onOpenChange={handleDeleteAccountModalOpenChange}
          entityType={EntityType.ACCOUNT}
          entities={[accountPendingDelete]}
          onComplete={() => {
            void loadAccounts();
          }}
        />
      )}

      <ConfirmationModal
        open={showDisableAccountConfirm}
        onOpenChange={handleDisableAccountModalOpenChange}
        title="Disable this account?"
        description={
          accountPendingDisable
            ? `Login will stop for ${accountPendingDisable.email}. The linked character is unlinked and contact fields are copied onto the character. This row stays in the list as Inactive until you permanently delete it (trash). The email address is freed for new registrations.`
            : ''
        }
        confirmText="Disable account"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (!accountPendingDisable) return;
          await ClientAPI.disableAccount(accountPendingDisable.id);
          await loadAccounts();
        }}
      />
    </div>
  );
}

export default function AccountsPage() {
  const [hasIAMAccess, setHasIAMAccess] = React.useState(false);
  const [isCheckingIAMAccess, setIsCheckingIAMAccess] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/auth/check-founder');
        const data = response.ok ? await response.json() : { isAuthorized: false };
        setHasIAMAccess(Boolean(data.isAuthorized));
      } catch {
        setHasIAMAccess(false);
      } finally {
        setIsCheckingIAMAccess(false);
      }
    };
    checkAccess();
  }, []);

  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading accounts…</div>}>
      <AccountsPageContent canAccessIAMConsole={hasIAMAccess} isCheckingIAMConsole={isCheckingIAMAccess} />
    </Suspense>
  );
}