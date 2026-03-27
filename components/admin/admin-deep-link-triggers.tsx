'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientAPI } from '@/lib/client-api';
import { OPEN_ENTITY_QUERY, OPEN_ID_QUERY } from '@/lib/utils/entity-admin-deep-links';
import type { Account, Character, FinancialRecord, Item, Player, Sale, Site, Task } from '@/types/entities';
import { reviveDates } from '@/lib/utils/date-utils';

type SaleHandler = (sale: Sale) => void;
type FinancialHandler = (record: FinancialRecord) => void;
type ItemHandler = (item: Item) => void;
type SiteHandler = (site: Site) => void;
type CharacterHandler = (character: Character) => void;
type PlayerHandler = (player: Player) => void;
type AccountHandler = (account: Account) => void;
type TaskHandler = (task: Task) => void;

/** Opens a sale modal when URL contains openEntity=sale&openId=… */
export function SalesDeepLinkTrigger({ onSale }: { onSale: SaleHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'sale' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const sale = await ClientAPI.getSaleById(id);
      if (cancelled || !sale) return;
      onSale(sale);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onSale]);

  return null;
}

/** Switches month/tab and opens a financial record when URL contains openEntity=financial&openId=… */
export function FinancesDeepLinkTrigger({ onFinancialRecord }: { onFinancialRecord: FinancialHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'financial' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const record = await ClientAPI.getFinancialRecordById(id);
      if (cancelled || !record) return;
      onFinancialRecord(record);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onFinancialRecord]);

  return null;
}

/** Sets inventory month/tab and opens item modal when URL contains openEntity=item&openId=… */
export function InventoriesDeepLinkTrigger({ onItem }: { onItem: ItemHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'item' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const item = await ClientAPI.getItemById(id);
      if (cancelled || !item) return;
      onItem(item);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onItem]);

  return null;
}

export function MapDeepLinkTrigger({ onSite }: { onSite: SiteHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'site' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const site = await ClientAPI.getSiteById(id);
      if (cancelled || !site) return;
      onSite(site);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onSite]);

  return null;
}

export function CharactersDeepLinkTrigger({ onCharacter }: { onCharacter: CharacterHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'character' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const character = await ClientAPI.getCharacterById(id);
      if (cancelled || !character) return;
      onCharacter(character);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onCharacter]);

  return null;
}

export function PlayerDeepLinkTrigger({ onPlayer }: { onPlayer: PlayerHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'player' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const player = await ClientAPI.getPlayerById(id);
      if (cancelled || !player) return;
      onPlayer(player);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onPlayer]);

  return null;
}

export function AccountsDeepLinkTrigger({ onAccount }: { onAccount: AccountHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'account' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const account = await ClientAPI.getAccountById(id);
      if (cancelled || !account) return;
      onAccount(account);
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onAccount]);

  return null;
}

export function ControlRoomDeepLinkTrigger({ onTask }: { onTask: TaskHandler }) {
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const entity = searchParams.get(OPEN_ENTITY_QUERY);
  const id = searchParams.get(OPEN_ID_QUERY);

  useEffect(() => {
    if (consumedRef.current || entity !== 'task' || !id) return;
    consumedRef.current = true;
    let cancelled = false;
    (async () => {
      const task = await ClientAPI.getTaskById(id);
      if (cancelled || !task) return;
      onTask(reviveDates(task));
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id, onTask]);

  return null;
}
