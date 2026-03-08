// workflows/collection.service.ts
import {
    getTasksForMonth,
    getSalesForMonth,
    getFinancialsForMonth,
    getItemsForMonth,
    upsertTask,
    upsertSale,
    upsertFinancial,
    upsertItem
} from '@/data-store/datastore';
import { TaskStatus, SaleStatus, FinancialStatus, ItemStatus, EntityType, PLAYER_ONE_ID } from '@/types/enums';
import { rewardPointsToPlayer } from './points-rewards-utils';
import { calculateClosingDate, formatMonthKey } from '@/lib/utils/date-utils';
import { kvSAdd } from '@/data-store/kv';
import { buildArchiveMonthsKey } from '@/data-store/keys';

/**
 * Unified Collection Service
 * Handles bulk collection and points vesting for all entity types.
 */
export const CollectionService = {
    /**
     * Collect all DONE tasks for a given month
     */
    async collectTasks(month: number, year: number) {
        const tasks = await getTasksForMonth(year, month);
        const toCollect = tasks.filter(t => t.status === TaskStatus.DONE && !t.isCollected);

        let count = 0;
        for (const task of toCollect) {
            const updatedTask = {
                ...task,
                status: TaskStatus.COLLECTED,
                isCollected: true,
                collectedAt: calculateClosingDate(task.doneAt || new Date()),
                updatedAt: new Date()
            };

            await upsertTask(updatedTask);

            // Vest Points
            if (task.rewards?.points) {
                const playerId = task.playerCharacterId || PLAYER_ONE_ID;
                await rewardPointsToPlayer(playerId, {
                    xp: task.rewards.points.xp || 0,
                    rp: task.rewards.points.rp || 0,
                    fp: task.rewards.points.fp || 0,
                    hp: task.rewards.points.hp || 0
                }, task.id, EntityType.TASK);
            }

            count++;
        }

        await this.updateArchiveIndex(EntityType.TASK, month, year);
        return { collectedCount: count };
    },

    /**
     * Collect all CHARGED sales for a given month
     */
    async collectSales(month: number, year: number) {
        const sales = await getSalesForMonth(year, month);
        const toCollect = sales.filter(s => s.status === SaleStatus.CHARGED && !s.isCollected);

        let count = 0;
        for (const sale of toCollect) {
            const updatedSale = {
                ...sale,
                status: SaleStatus.COLLECTED,
                isCollected: true,
                collectedAt: calculateClosingDate(sale.chargedAt || sale.saleDate || new Date()),
                updatedAt: new Date()
            };

            await upsertSale(updatedSale);

            // Vest Points (Standardized 2-step)
            // We calculate points from revenue because Sales don't have a 'rewards' field usually, 
            // but they are calculated on the fly in the workflow.
            const { calculatePointsFromRevenue } = await import('./points-rewards-utils');
            const points = calculatePointsFromRevenue(sale.totals.totalRevenue);
            const playerId = sale.playerCharacterId || PLAYER_ONE_ID;
            await rewardPointsToPlayer(playerId, points, sale.id, EntityType.SALE);

            count++;
        }

        await this.updateArchiveIndex(EntityType.SALE, month, year);
        return { collectedCount: count };
    },

    /**
     * Collect all DONE financials for a given month
     */
    async collectFinancials(month: number, year: number) {
        const financials = await getFinancialsForMonth(year, month);
        const toCollect = financials.filter(f => f.status === FinancialStatus.DONE && !f.isCollected);

        let count = 0;
        for (const financial of toCollect) {
            const updatedFinancial = {
                ...financial,
                status: FinancialStatus.COLLECTED,
                isCollected: true,
                collectedAt: calculateClosingDate(new Date(year, month - 1, 15)), // Mid-month fallback
                updatedAt: new Date()
            };

            await upsertFinancial(updatedFinancial);

            // Vest Points
            if (financial.rewards?.points) {
                const playerId = financial.playerCharacterId || PLAYER_ONE_ID;
                await rewardPointsToPlayer(playerId, {
                    xp: financial.rewards.points.xp || 0,
                    rp: financial.rewards.points.rp || 0,
                    fp: financial.rewards.points.fp || 0,
                    hp: financial.rewards.points.hp || 0
                }, financial.id, EntityType.FINANCIAL);
            }

            count++;
        }

        await this.updateArchiveIndex(EntityType.FINANCIAL, month, year);
        return { collectedCount: count };
    },

    /**
     * Collect all SOLD items for a given month
     */
    async collectInventory(month: number, year: number) {
        const items = await getItemsForMonth(year, month);
        const toCollect = items.filter(i => (i.status === ItemStatus.SOLD || i.status === ItemStatus.COLLECTED) && !i.isCollected);

        let count = 0;
        for (const item of toCollect) {
            const updatedItem = {
                ...item,
                status: ItemStatus.COLLECTED,
                isCollected: true,
                collectedAt: calculateClosingDate(item.soldAt || new Date()),
                updatedAt: new Date()
            };

            await upsertItem(updatedItem);

            // Vest Points (New logic for Items)
            if (item.rewards?.points) {
                const playerId = item.ownerCharacterId || PLAYER_ONE_ID;
                await rewardPointsToPlayer(playerId, {
                    xp: item.rewards.points.xp || 0,
                    rp: item.rewards.points.rp || 0,
                    fp: item.rewards.points.fp || 0,
                    hp: item.rewards.points.hp || 0
                }, item.id, EntityType.ITEM);
            }

            count++;
        }

        await this.updateArchiveIndex(EntityType.ITEM, month, year);
        return { collectedCount: count };
    },

    /**
     * Internal helper to ensure month is in the archive index
     */
    async updateArchiveIndex(type: EntityType, month: number, year: number) {
        const monthKey = formatMonthKey(new Date(year, month - 1, 1));
        await kvSAdd(buildArchiveMonthsKey(), monthKey);
        // Individual record indexing is handled by the entity workflows (upsert)
    }
};
