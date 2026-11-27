// @ts-nocheck
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
import { getTaskDoneAt, withTaskLifecycle } from '@/lib/utils/task-lifecycle-utils';
import { getEntityLogs } from '@/workflows/entities-logging';

/**
 * Monthly collection: tasks and sales only. Points vest on those entities in their workflows.
 * Items archive when sold (item.workflow); no item "collection" step.
 */
export const CollectionService = {
    async collectTasks(month: number, year: number) {
        const tasks = await getTasksForMonth(year, month);
        const toCollect = tasks.filter(t => t.status === TaskStatus.DONE && t.status !== TaskStatus.COLLECTED);
        const taskMonthKey = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
        const taskLogs = await getEntityLogs(EntityType.TASK, { month: taskMonthKey });
        const doneAtByTask = new Map<string, Date>();
        for (const entry of taskLogs) {
            const event = String(entry.event ?? entry.status ?? '').toLowerCase();
            if (event !== 'done' || !entry.entityId || doneAtByTask.has(entry.entityId)) continue;
            const timestamp = new Date(entry.timestamp);
            if (Number.isFinite(timestamp.getTime())) doneAtByTask.set(entry.entityId, timestamp);
        }

        let count = 0;
        for (const task of toCollect) {
            // Older rows can have a DONE lifecycle log but no canonical
            // lifecycle.doneAt. Recover only from that exact event timestamp;
            // never substitute collection time for the completion time.
            const doneAt = getTaskDoneAt(task) || doneAtByTask.get(task.id);
            const updatedTask = withTaskLifecycle({
                ...task,
                status: TaskStatus.COLLECTED,
                updatedAt: getUTCNow()
            }, {
                ...(doneAt ? { doneAt } : {}),
                collectedAt: endOfMonthUTC(doneAt ? (doneAt instanceof Date ? doneAt : new Date(doneAt as string)) : getUTCNow()),
            });

            await upsertTask(updatedTask);
            count++;
        }

        await this.updateArchiveIndex(EntityType.TASK, month, year);
        return { collectedCount: count };
    },

    async collectSales(month: number, year: number) {
        const sales = await getSalesForMonth(year, month);
        const toCollect = sales.filter(s => s.status === SaleStatus.CHARGED && s.status !== SaleStatus.COLLECTED);

        let count = 0;
        for (const sale of toCollect) {
            const updatedSale = {
                ...sale,
                status: SaleStatus.COLLECTED,
                
                collectedAt: endOfMonthUTC(sale.lifecycle?.chargedAt ? new Date(sale.lifecycle.chargedAt) : sale.createdAt ? new Date(sale.createdAt) : sale.saleDate ? new Date(sale.saleDate) : getUTCNow()),
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


