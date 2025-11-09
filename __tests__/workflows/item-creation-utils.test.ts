import type { FinancialRecord, Item } from '@/types/entities';
import { ItemStatus } from '@/types/enums';
import { createItemFromRecord } from '@/workflows/item-creation-utils';

jest.mock('@/data-store/datastore', () => ({
  getItemById: jest.fn(),
  upsertItem: jest.fn(),
  getItemsBySourceTaskId: jest.fn(),
  getItemsBySourceRecordId: jest.fn(),
  removeItem: jest.fn(),
}));

const { getItemById, upsertItem } = jest.requireMock('@/data-store/datastore') as {
  getItemById: jest.Mock;
  upsertItem: jest.Mock;
};

describe('createItemFromRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upsertItem.mockImplementation(async (item: Item) => item);
  });

  const baseRecord: FinancialRecord = {
    id: 'fin-1',
    name: 'Commission Deposit',
    description: 'Client payment for mural',
    createdAt: new Date('2025-11-01T10:00:00.000Z'),
    updatedAt: new Date('2025-11-01T10:00:00.000Z'),
    year: 2025,
    month: 11,
    station: 'SALES' as any,
    type: 'company',
    cost: 0,
    revenue: 1200,
    jungleCoins: 0,
    netCashflow: 1200,
    jungleCoinsValue: 0,
    isCollected: false,
    links: [],
  };

  it('creates a new item with owner metadata and None site fallback', async () => {
    const record: FinancialRecord = {
      ...baseRecord,
      outputItemType: 'ARTWORK' as any,
      outputItemName: 'Mural Commission',
      outputQuantity: 1,
      outputUnitCost: 400,
      outputItemPrice: 1200,
      customerCharacterId: 'char-123',
      siteId: null,
      targetSiteId: null,
      isNewItem: true,
    };

    const created = await createItemFromRecord(record);

    expect(created).toBeTruthy();
    expect(created?.ownerCharacterId).toBe('char-123');
    expect(created?.stock[0].siteId).toBe('None');
    expect(upsertItem).toHaveBeenCalledTimes(1);
  });

  it('increments existing item stock and assigns owner when reusing inventory', async () => {
    const existingItem: Item = {
      id: 'item-reuse-1',
      name: 'Inventory Canvas',
      description: 'Blank canvas',
      type: 'MATERIAL' as any,
      collection: undefined,
      status: ItemStatus.IDLE,
      station: 'PRODUCTION' as any,
      unitCost: 50,
      additionalCost: 0,
      price: 0,
      value: 0,
      quantitySold: 0,
      isCollected: false,
      year: 2025,
      createdAt: new Date('2025-10-01T10:00:00.000Z'),
      updatedAt: new Date('2025-10-01T10:00:00.000Z'),
      stock: [{ siteId: 'hq', quantity: 3 }],
      links: [],
    };

    getItemById.mockResolvedValue(existingItem);

    const record: FinancialRecord = {
      ...baseRecord,
      id: 'fin-2',
      outputItemId: existingItem.id,
      isNewItem: false,
      outputQuantity: 2,
      customerCharacterId: 'char-789',
      targetSiteId: null,
    };

    const updated = await createItemFromRecord(record);

    expect(getItemById).toHaveBeenCalledWith(existingItem.id);
    expect(updated?.stock.find((s) => s.siteId === 'hq')?.quantity).toBe(5);
    expect(updated?.ownerCharacterId).toBe('char-789');
  });
});

