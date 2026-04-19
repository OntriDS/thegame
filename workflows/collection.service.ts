// workflows/collection.service.ts
import {
    getTasksForMonth,
    getSalesForMonth,
    upsertTask,
    upsertSale,
} from '@/data-store/datastore';
import { TaskStatus, SaleStatus, EntityType } from '@/types/enums';
import { getUTCNow, endOfMonthUTC, formatArchiveMonthKeyUTCFromParts } from '@/lib/utils/utc-utils';
import { kvSAdd } from '@/lib/utils/kv';
import { buildArchiveMonthsKey } from '@/data-store/keys';

/**
 * Monthly collection: tasks and sales only. Points vest on those entities in their workflows.
 * Items archive when sold (item.workflow); no item "collection" step.
 */
export const CollectionService = {
    async collectTasks(month: number, year: number) {
        const tasks = await getTasksForMonth(year, month);
        const toCollect = tasks.filter(t => t.status === TaskStatus.DONE && !t.isCollected);

        let count = 0;
        for (const task of toCollect) {
            const updatedTask = {
                ...task,
                status: TaskStatus.COLLECTED,
                isCollected: true,
                collectedAt: endOfMonthUTC(task.doneAt ? (task.doneAt instanceof Date ? task.doneAt : new Date(task.doneAt as string)) : getUTCNow()),
                updatedAt: getUTCNow()
            };

            await upsertTask(updatedTask);
            count++;
        }

        await this.updateArchiveIndex(EntityType.TASK, month, year);
        return { collectedCount: count };
    },

    async collectSales(month: number, year: number) {
        const sales = await getSalesForMonth(year, month);
        const toCollect = sales.filter(s => s.status === SaleStatus.CHARGED && !s.isCollected);

        let count = 0;
        for (const sale of toCollect) {
            const updatedSale = {
                ...sale,
                status: SaleStatus.COLLECTED,
                isCollected: true,
                collectedAt: endOfMonthUTC((sale as any).chargedAt ? new Date((sale as any).chargedAt) : sale.saleDate ? (sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate as string)) : getUTCNow()),
                updatedAt: getUTCNow()
            };

            await upsertSale(updatedSale);
            count++;
        }

        await this.updateArchiveIndex(EntityType.SALE, month, year);
        return { collectedCount: count };
    },

    async updateArchiveIndex(type: EntityType, month: number, year: number) {
        const monthKey = formatArchiveMonthKeyUTCFromParts(year, month);
        await kvSAdd(buildArchiveMonthsKey(), monthKey);
    }
};

