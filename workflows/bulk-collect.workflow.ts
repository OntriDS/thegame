import { getTasksForMonth, upsertTask } from '@/data-store/datastore';
import { TaskStatus } from '@/types/enums';

/**
 * Workflow to automatically collect all DONE tasks for a given month and year.
 * This should be triggered by the user via the Automation tree, or by a cron job.
 */
export async function bulkCollectMonthTasks(month: number, year: number): Promise<{ collectedCount: number }> {
    try {
        console.log(`[bulkCollectMonthTasks] Starting collection for ${month}/${year}`);
        const tasks = await getTasksForMonth(year, month);

        const tasksToCollect = tasks.filter((t: any) => t.status === TaskStatus.DONE);
        console.log(`[bulkCollectMonthTasks] Found ${tasksToCollect.length} tasks ready to collect.`);

        let collectedCount = 0;

        for (const task of tasksToCollect) {
            try {
                // The onTaskUpsert workflow handles rewriting the `status` if we simply update it.
                // To enable the "Restore Tasks" phase we add the special `bulkSelectedMonth` flag
                // Though it's not strictly necessary if we just rely on `collectedAt` dates.
                const updatedTask = {
                    ...task,
                    status: TaskStatus.COLLECTED,
                    updatedAt: new Date()
                };

                await upsertTask(updatedTask);
                collectedCount++;
            } catch (err) {
                console.error(`[bulkCollectMonthTasks] Failed to collect task ${task.id}:`, err);
                // Continue with other tasks even if one fails
            }
        }

        console.log(`[bulkCollectMonthTasks] Successfully collected ${collectedCount} tasks.`);
        return { collectedCount };
    } catch (error) {
        console.error('[bulkCollectMonthTasks] Error during bulk collection:', error);
        throw error;
    }
}
