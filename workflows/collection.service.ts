// workflows/collection.service.ts
import {
    getTasksForMonth,
    getSalesForMonth,
    upsertTask,
    upsertSale,
} from '@/data-store/datastore';
import { TaskStatus, SaleStatus, EntityType } from '@/types/enums';
import { calculateClosingDate, formatMonthKey } from '@/lib/utils/date-utils';
import { kvSAdd } from '@/data-store/kv';
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
                collectedAt: calculateClosingDate(task.doneAt || new Date()),
                updatedAt: new Date()
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
                collectedAt: calculateClosingDate(sale.chargedAt || sale.saleDate || new Date()),
                updatedAt: new Date()
            };

            await upsertSale(updatedSale);
            count++;
        }

        await this.updateArchiveIndex(EntityType.SALE, month, year);
        return { collectedCount: count };
    },

    async updateArchiveIndex(type: EntityType, month: number, year: number) {
        const monthKey = formatMonthKey(new Date(year, month - 1, 1));
        await kvSAdd(buildArchiveMonthsKey(), monthKey);
    }
};
