// workflows/collection.service.ts
import {
    getTasksForMonth,
    getSalesForMonth,
    getItemsForMonth,
    upsertTask,
    upsertSale,
    upsertItem
} from '@/data-store/datastore';
import { TaskStatus, SaleStatus, ItemStatus, EntityType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { rewardPointsToPlayer } from './points-rewards-utils';
import { calculateClosingDate, formatMonthKey } from '@/lib/utils/date-utils';
import { kvSAdd } from '@/data-store/kv';
import { buildArchiveMonthsKey } from '@/data-store/keys';

/**
 * Unified Collection Service
 * Handles bulk collection and points vesting for all entity types.
 * Task/Sale rewards on COLLECTED are applied in entity workflows (staging + effect keys), not here.
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
            // Points: onTaskUpsert rewards when task.rewards + pointsStaged (see task.workflow.ts)

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
            // Points: onSaleUpsert rewards explicit sale.rewards.points when pointsStaged (see sale.workflow.ts)

            count++;
        }

        await this.updateArchiveIndex(EntityType.SALE, month, year);
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
                const playerId = item.ownerCharacterId || FOUNDER_CHARACTER_ID;
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
