 'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientAPI } from '@/lib/client-api';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import CharacterModal from '@/components/modals/character-modal';
import type { Character } from '@/types/entities';
import { CharacterRole } from '@/types/enums';
import { ROLE_COLORS } from '@/lib/constants/color-constants';
import { ChevronLeft, ChevronRight, Mail, Phone, Plus, RefreshCw } from 'lucide-react';
import { CharactersDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';
import { getUTCNow } from '@/lib/utils/utc-utils';

type CharacterSortOption = 'name-asc' | 'name-desc' | 'role-asc' | 'role-desc';
type SortByOption = {
  value: CharacterSortOption;
  label: string;
};

const SORT_BY_OPTIONS: SortByOption[] = [
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
  { value: 'role-asc', label: 'Role: A-Z' },
  { value: 'role-desc', label: 'Role: Z-A' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const getRoleColorClass = (role: CharacterRole): string => {
  const roleKey = role.toUpperCase().replace(/-/g, '') as keyof typeof ROLE_COLORS;
  return ROLE_COLORS[roleKey] || ROLE_COLORS.CUSTOMER;
};

const getSortedRoleList = (roles: CharacterRole[] | undefined | null): CharacterRole[] => {
  return [...(roles || [])].sort((a, b) => a.localeCompare(b));
};

const getSafePage = (page: number, totalPages: number): number => {
  if (totalPages === 0) return 1;
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
};

const formatUSD = (value: number): string => `$${value.toFixed(2)}`;

function CharactersPageContent() {
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<CharacterSortOption>('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isLoadingRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const lastRequestId = useRef(0);

  useKeyboardShortcuts({
    onOpenCharacterModal: () => setShowCharacterModal(true),
  });

  const safePage = useMemo(() => getSafePage(page, totalPages), [page, totalPages]);

  const loadCharacters = useCallback(async () => {
    const requestId = ++lastRequestId.current;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await ClientAPI.getCharacterDirectory({
        search: searchTerm || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        sortBy: sortOption.startsWith('role') ? 'role' : 'name',
        sortOrder: sortOption.endsWith('asc') ? 'asc' : 'desc',
        page: safePage,
        pageSize,
        _t: getUTCNow().getTime(), // Force cache bust
      });

      if (requestId !== lastRequestId.current) return;

      setCharacters(response.items || []);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setRoleCounts(response.roleCounts || {});
      if (safePage !== response.page) {
        setPage(response.page);
      }
      setIsHydrated(true);
    } catch (error) {
      console.error('[Characters Section] Failed to load characters:', error);
    } finally {
      if (requestId === lastRequestId.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
        lastRefreshRef.current = Date.now();
      }
    }
  }, [safePage, searchTerm, roleFilter, sortOption, pageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, sortOption, pageSize]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const handleUpdate = useCallback(() => {
    const now = Date.now();
    if (isLoadingRef.current) return;
    if (now - lastRefreshRef.current < 1000) return;
    loadCharacters();
  }, [loadCharacters]);

  const handleReload = useCallback(() => {
    if (isLoadingRef.current) return;
    loadCharacters();
  }, [loadCharacters]);

  useEntityUpdates('character', handleUpdate);

  const handleCharacterSave = useCallback(async (character: Character) => {
    try {
      await ClientAPI.upsertCharacter(character);
      setShowCharacterModal(false);
      setSelectedCharacter(null);
      await loadCharacters();
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  }, [loadCharacters]);

  const handleCreateCharacter = useCallback(() => {
    setSelectedCharacter(null);
    setShowCharacterModal(true);
  }, []);

  const handleEditCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setShowCharacterModal(true);
  }, []);

  const handleCharacterDeepLink = useCallback(
    (character: Character) => {
      handleEditCharacter(character);
    },
    [handleEditCharacter],
  );

  const roleFilterOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: 'ALL', label: `All Roles (${total})` },
    ];

    Object.keys(roleCounts)
      .sort((a, b) => a.localeCompare(b))
      .forEach((role) => {
        const count = roleCounts[role] ?? 0;
        options.push({
          value: role,
          label: `${role} (${count})`,
        });
      });

    if (roleFilter !== 'ALL' && !options.some((option) => option.value === roleFilter)) {
      options.push({ value: roleFilter, label: `${roleFilter} (0)` });
    }

    return options;
  }, [roleCounts, total, roleFilter]);

  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Characters</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReload}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            <Button onClick={handleCreateCharacter} size="sm" variant="default" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Character
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading characters...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CharactersDeepLinkTrigger onCharacter={handleCharacterDeepLink} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Characters</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReload}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, phone or description..."
            className="h-8 w-72"
          />
          <Button onClick={handleCreateCharacter} size="sm" variant="default" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Character
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 py-4">
          <div className="w-full sm:w-52">
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value === 'ALL' ? 'ALL' : (value as CharacterRole))}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <div className="w-full sm:w-52">
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as CharacterSortOption)}>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_BY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}/page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading characters...</div>
          ) : characters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {roleFilter === 'ALL'
                ? searchTerm
                  ? `No characters match "${searchTerm}"`
                  : 'No characters found'
                : `No characters with ${roleFilter} role.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-muted/50 bg-muted/20">
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Roles</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Contact</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-right">Charged</th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-right">
                          Paid
                        </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/20">
                  {characters.map((character) => {
                    const roles = getSortedRoleList(character.roles);
                    const hasContactInfo = character.contactEmail || character.contactPhone;
                        const purchasedAmount = character.purchasedAmount ?? 0;
                        const beneficiaryPaidAmount = character.beneficiaryPaidAmount ?? 0;
                    return (
                      <tr key={character.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3">
                          <div className="font-semibold">{character.name}</div>
                          {character.description && (
                            <div className="text-xs text-muted-foreground max-w-xl line-clamp-1 mt-1">
                              {character.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <span
                                key={role}
                                className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${getRoleColorClass(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1 text-xs">
                            {character.contactEmail && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{character.contactEmail}</span>
                              </div>
                            )}
                            {character.contactPhone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{character.contactPhone}</span>
                              </div>
                            )}
                            {!hasContactInfo && <span className="text-muted-foreground">No contact info</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {purchasedAmount > 0 ? formatUSD(purchasedAmount) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {beneficiaryPaidAmount > 0 ? formatUSD(beneficiaryPaidAmount) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCharacter(character)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {rangeStart}-{rangeEnd} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            disabled={isLoading || safePage <= 1 || total === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {safePage} / {Math.max(totalPages, 1)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((previous) => Math.min(totalPages || 1, previous + 1))}
            disabled={isLoading || safePage >= Math.max(totalPages, 1) || total === 0}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CharacterModal
        character={selectedCharacter}
        open={showCharacterModal}
        onOpenChange={setShowCharacterModal}
        onSave={handleCharacterSave}
      />
    </div>
  );
}

export default function CharactersPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading characters…</div>}>
      <CharactersPageContent />
    </Suspense>
  );
}
