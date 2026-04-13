'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Shield, User, Zap, RefreshCw, Cpu, Activity, Database, Check, Copy, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterRole } from '@/types/enums';
import { filterRolesToSpecialOnly } from '@/lib/character-roles';
import { PLAYER_SELECTABLE_ROLES } from '@/lib/game-mechanics/roles-rules';

type IAMConsoleAccount = {
  id?: string;
  name?: string;
  isActive?: boolean;
  roles: CharacterRole[];
  characterId?: string;
};

type IAMSystemIdentity = {
  appId: string;
  createdAt?: string;
};

/**
 * Digital Universe IAM Console
 * Premium Dashboard for managing Identities and M2M Connections.
 */
export default function IAMConsole() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ appId: string, apiKey: string } | null>(null);
  const [targetAppId, setTargetAppId] = useState('pixelbrain');
  const [copied, setCopied] = useState(false);
  const [hasFounderAccess, setHasFounderAccess] = useState<boolean>(false);
  const [isFounderCheckLoading, setIsFounderCheckLoading] = useState(true);
  const playerSelectableRoles = useMemo(() => PLAYER_SELECTABLE_ROLES as readonly string[], []);

  const identityBreakdown = useMemo(() => {
    const accounts = (data?.accounts || []) as Array<IAMConsoleAccount>;
    const systems = (data?.systems || []) as Array<IAMSystemIdentity>;
    const characters = (data?.characters || []) as Array<{ id: string; roles?: CharacterRole[]; name?: string }>;
    const charactersById = new Map(characters.map((character) => [character.id, character]));

    const resolvedAccounts = accounts.map((account) => {
      const character = account?.characterId ? charactersById.get(account.characterId) : undefined;
      const roles = filterRolesToSpecialOnly(character?.roles);

      return {
        account,
        roles,
        identityLabel: (account?.name || character?.name || account?.id || 'Unknown Account').trim(),
        identityMeta: account?.id || '',
      };
    });

    const founderAccounts = resolvedAccounts.filter((entry) =>
      entry.roles.includes(CharacterRole.FOUNDER)
    );
    const unassigned = resolvedAccounts.filter(
      (entry) => !founderAccounts.includes(entry)
    );
    const playerSelectableAccounts = unassigned.filter((entry) =>
      entry.roles.some((role) => playerSelectableRoles.includes(role))
    );
    const playerSelectableSet = new Set(playerSelectableAccounts);
    const otherAccounts = unassigned.filter((entry) => !playerSelectableSet.has(entry));
    const orderedSystems = [...systems].sort((a, b) =>
      String(a.appId).localeCompare(String(b.appId), undefined, { sensitivity: 'base' })
    );

    const sortByName = (a: any, b: any) =>
      String(a.identityLabel).localeCompare(String(b.identityLabel), undefined, { sensitivity: 'base' });

    return {
      founderAccounts: [...founderAccounts].sort(sortByName),
      systemAccounts: [...orderedSystems],
      playerSelectableAccounts: [...playerSelectableAccounts].sort(sortByName),
      otherAccounts: [...otherAccounts].sort(sortByName),
    };
    }, [data, playerSelectableRoles]);

  const cardCounts = useMemo(() => ({
    totalFounderAccounts: identityBreakdown.founderAccounts.length,
    totalSystems: identityBreakdown.systemAccounts.length,
    totalPlayerSelectable: identityBreakdown.playerSelectableAccounts.length,
    totalOtherAccounts: identityBreakdown.otherAccounts.length,
  }), [identityBreakdown]);

  useEffect(() => {
    fetchIAMData();
  }, []);

  const fetchIAMData = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/admin/iam');
      const json = await resp.json();
      if (resp.ok) {
        setData(json);
      } else {
        setError(json.error || 'Failed to sync IAM data');
      }
    } catch (err) {
      setError('Network synchronization failure');
    } finally {
      setIsLoading(false);
    }
  };

  const registerSystem = async () => {
    if (!targetAppId) return;
    setIsLoading(true);
    try {
      const resp = await fetch('/api/admin/m2m/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: targetAppId })
      });
      const json = await resp.json();
      if (resp.ok) {
        setGeneratedKey({ appId: json.appId, apiKey: json.apiKey });
        fetchIAMData(); // Refresh list
      } else {
        setError(json.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration sync failure');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkFounderAccess = async () => {
    try {
      const response = await fetch('/api/auth/check-founder');
      const data = response.ok ? await response.json() : { isAuthorized: false };
      setHasFounderAccess(Boolean(data.isAuthorized));
    } catch {
      setHasFounderAccess(false);
    } finally {
      setIsFounderCheckLoading(false);
    }
  };

  useEffect(() => {
    checkFounderAccess();
  }, []);

  const playerSelectableRoleLabel = useMemo(
    () =>
      playerSelectableRoles
        .map((role) => role.toUpperCase())
        .join(', '),
    [playerSelectableRoles],
  );

  const renderRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      founder: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      team: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'ai-agent': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      developer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      player: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
      customer: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      beneficiary: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      apprentice: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
      family: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
      'token-holder': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      partner: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      system: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      m2m: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    const colorClass = roleColors[role.toLowerCase()] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

    return (
      <Badge
        key={role}
        variant="outline"
        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${colorClass}`}
      >
        {role.toUpperCase()}
      </Badge>
    );
  };

  const statusBadgeClasses = {
    green: 'bg-green-500/10 text-green-500 border border-green-500/20',
    red: 'bg-red-500/10 text-red-500 border border-red-500/20',
    amber: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  };

  const identityRows = useMemo(() => {
    const buildHumanRows = (rows: Array<any>) => rows.map((entry) => ({
      id: entry.account?.id || entry.identityMeta,
      name: entry.identityLabel,
      meta: entry.identityMeta,
      type: 'Human (Account)',
      roles: entry.roles.length > 0 ? entry.roles : ['UNASSIGNED'],
      status: entry.account?.isActive === false ? 'INACTIVE' : 'VERIFIED',
      statusTone: entry.account?.isActive === false ? 'red' : 'green',
    }));

    const buildSystemRows = (rows: Array<IAMSystemIdentity>) => rows.map((system) => ({
      id: system.appId,
      name: system.appId,
      meta: system.createdAt ? new Date(system.createdAt).toLocaleString() : 'No timestamp',
      type: 'Agent (M2M)',
      roles: ['SYSTEM'],
      status: 'REGISTERED',
      statusTone: 'amber',
    }));

    return {
      founder: buildHumanRows(identityBreakdown.founderAccounts),
      playerSelectable: buildHumanRows(identityBreakdown.playerSelectableAccounts),
      other: buildHumanRows(identityBreakdown.otherAccounts),
      systems: buildSystemRows(identityBreakdown.systemAccounts),
    };
  }, [identityBreakdown]);

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-2xl">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-destructive mb-2">IAM System Lockout</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={fetchIAMData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry Sync
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-primary/10">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            IAM Console
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">Identity & Access Management</p>
        </div>
        <div className="flex items-center gap-3">
          {hasFounderAccess ? (
            <Link
              href="/admin/accounts"
              className="inline-flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-widest transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 border-primary/20"
            >
              <Users className="h-4 w-4" />
              Accounts
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={true}
              className={`h-9 px-3 gap-2 text-sm font-bold uppercase tracking-widest border border-muted text-muted-foreground ${isFounderCheckLoading ? 'cursor-wait' : 'cursor-not-allowed opacity-50'}`}
            >
              <Users className="h-4 w-4" />
              {isFounderCheckLoading ? 'Checking access…' : 'Accounts'}
            </Button>
          )}
          <Button onClick={fetchIAMData} disabled={isLoading} variant="outline" size="sm" className="gap-2 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Vault
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-tighter text-primary">System Online</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5 overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <User size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600/70">Master Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600">{cardCounts.totalFounderAccounts}</div>
            <p className="text-[10px] font-bold text-emerald-600/50 mt-1 uppercase tracking-tighter leading-none">FOUNDER Role</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20 shadow-lg shadow-blue-500/5 overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Activity size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600/70">System Identity (M2M)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-blue-600">{cardCounts.totalSystems}</div>
            <p className="text-[10px] font-bold text-blue-600/50 mt-1 uppercase tracking-tighter leading-none">Agent Registrations</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/5 border-orange-500/20 shadow-lg shadow-orange-500/5 overflow-hidden relative group text-right">
          <div className="absolute -left-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Cpu size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-600/70">Player Selectable Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-orange-600">{cardCounts.totalPlayerSelectable}</div>
            <p className="text-[10px] font-bold text-orange-600/50 mt-1 uppercase tracking-tighter leading-none">Derived From Access Policy</p>
          </CardContent>
        </Card>

        <Card className="bg-violet-500/5 border-violet-500/20 shadow-lg shadow-violet-500/5 overflow-hidden relative group text-right">
          <div className="absolute -left-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Shield size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-violet-600/70">Other Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-violet-600">{cardCounts.totalOtherAccounts}</div>
            <p className="text-[10px] font-bold text-violet-600/50 mt-1 uppercase tracking-tighter leading-none">Non-Selectable Access</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-primary/20 shadow-xl border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Register System
              </CardTitle>
              <CardDescription className="text-xs font-medium">Grant system-level API access to an app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appId" className="text-[10px] font-black uppercase tracking-widest opacity-50">Application Identifier</Label>
                <Input 
                  id="appId" 
                  placeholder="e.g. pixelbrain" 
                  value={targetAppId} 
                  onChange={(e) => setTargetAppId(e.target.value)}
                  className="bg-accent/30 font-mono text-sm"
                />
              </div>
              <Button 
                onClick={registerSystem} 
                disabled={isLoading || !targetAppId} 
                className="w-full h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Authorize Key'}
              </Button>

              <AnimatePresence>
                {generatedKey && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 mt-6 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Key Generated!</span>
                      <Badge variant="outline" className="bg-orange-500 text-white border-none font-black text-[9px] uppercase tracking-tighter">SECURE</Badge>
                    </div>
                    <div className="font-mono text-[10px] p-2 bg-black/20 rounded border border-orange-500/20 break-all select-all font-bold">
                      {generatedKey.apiKey}
                    </div>
                    <Button 
                      onClick={() => copyToClipboard(generatedKey.apiKey)} 
                      variant="outline" 
                      className="w-full h-9 gap-2 text-[10px] border-orange-500/30 hover:bg-orange-500/10"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'COPIED!' : 'COPY API KEY'}
                    </Button>
                    <p className="text-[9px] font-bold text-orange-600/70 uppercase leading-tight italic">
                      Add to Vercel env: THEGAME_M2M_KEY
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="bg-accent/10 border-accent/20">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <Key className="h-4 w-4 opacity-50" />
                   Handshake Hub
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                 <p className="text-[10px] font-medium leading-relaxed opacity-70 italic">
                    The Single-Sign-On mechanism is active. When you click connections to other systems, 
                    a 60s single-use token will be generated to teleport your identity.
                 </p>
                 <div className="p-3 bg-black/20 rounded-lg border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter opacity-70">
                        <span>Teleport Status</span>
                        <span className="text-emerald-500">READY</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[100%]" />
                    </div>
                 </div>
             </CardContent>
          </Card>
        </div>

        {/* Identity Table Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary opacity-50" />
                  Active Identities
                </CardTitle>
                <CardDescription className="text-xs">Classified by role and source.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {[
                {
                  title: 'Founder Role Accounts',
                  subtitle: 'Accounts with FOUNDER role.',
                  rows: identityRows.founder,
                },
                {
                  title: 'M2M Accounts',
                  subtitle: 'System identities provisioned through IAM API.',
                  rows: identityRows.systems,
                },
                {
                  title: 'Player Selectable Roles',
                  subtitle: `Internal role mapping: ${playerSelectableRoleLabel}`,
                  rows: identityRows.playerSelectable,
                },
                {
                  title: 'Other Accounts',
                  subtitle: 'Remaining human accounts not in prior partitions.',
                  rows: identityRows.other,
                },
              ].map((section) => (
                <section key={section.title} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-[11px] flex items-center gap-2">
                        {section.title}
                        <span className="text-[10px] font-bold opacity-60">({section.rows.length})</span>
                      </h3>
                      <p className="text-[10px] font-bold opacity-70 mt-1 leading-none tracking-tighter">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-primary/10">
                          <th className="py-4 font-black uppercase tracking-widest text-[10px] opacity-50">Identity</th>
                          <th className="py-4 font-black uppercase tracking-widest text-[10px] opacity-50">Type</th>
                          <th className="py-4 font-black uppercase tracking-widest text-[10px] opacity-50 px-2">Roles</th>
                          <th className="py-4 font-black uppercase tracking-widest text-[10px] opacity-50 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {section.rows.length === 0 && (
                          <tr>
                            <td className="py-6 text-xs text-muted-foreground" colSpan={4}>No identities in this partition.</td>
                          </tr>
                        )}
                        {section.rows.map((row: any) => (
                          <tr key={row.id} className="group hover:bg-primary/5 transition-colors">
                            <td className="py-4">
                              <div className="font-black tracking-tight">{row.name}</div>
                              <div className="text-[10px] font-mono opacity-40">{row.meta}</div>
                            </td>
                            <td className="py-4 font-black text-[10px] uppercase opacity-70 tracking-tighter">{row.type}</td>
                            <td className="py-4 px-2">
                              <div className="flex flex-wrap gap-1">
                                {(row.roles || ['NO_ROLE']).map((role: string) => renderRoleBadge(role))}
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <Badge className={`${statusBadgeClasses[row.statusTone as keyof typeof statusBadgeClasses]} text-[9px] font-black uppercase tracking-widest`}>
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-primary/5 border-primary/10">
                <CardHeader>
                   <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Shield className="h-3 w-3 opacity-50" />
                      Security Audit
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold opacity-60">JWT Secret Loaded</span>
                      <Check className="h-3 w-3 text-green-500" />
                   </div>
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold opacity-60">Redis Persistence</span>
                      <Check className="h-3 w-3 text-green-500" />
                   </div>
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold opacity-60">Cross-App Handshake</span>
                      <Check className="h-3 w-3 text-green-500" />
                   </div>
                </CardContent>
             </Card>

             <Card className="bg-accent/5 border-accent/10">
                <CardHeader>
                   <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                      <RefreshCw className="h-3 w-3 opacity-50" />
                      Identity Evolution
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-[10px] font-medium leading-relaxed opacity-60">
                      When a Character is granted the PLAYER role, an automated process creates their 
                      gameplay profile in the Player registry. This evolution is permanent.
                   </p>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
