import { getAllTasks, upsertTask } from '@/data-store/datastore';
import { TaskType, EntityType, LogEventType } from '@/types/enums';
import { appendEntityLog } from '@/workflows/entities-logging';

/**
 * Migration Workflow: Recurrent Dates Standardization
 * 
 * Backfills recurrenceStart and recurrenceEnd for existing themes.
 * - recurrenceStart: Defaults to template.createdAt
 * - recurrenceEnd: Defaults to template.dueDate (legacy safety limit)
 */
export async function migrateRecurrentDates(): Promise<{ updated: number, total: number, errors: number }> {
    const allTasks = await getAllTasks();
    const templates = allTasks.filter(t => t.type === TaskType.RECURRENT_TEMPLATE);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log(`[Migration] Starting recurrent date migration for ${templates.length} templates...`);
    
    for (const template of templates) {
        try {
            // Already migrated or explicitly set? Skip unless missing one.
            if (template.recurrenceStart && template.recurrenceEnd) continue;
            
            const updatedTemplate = { 
                ...template,
                recurrenceStart: template.recurrenceStart || template.createdAt || new Date(),
                recurrenceEnd: template.recurrenceEnd || template.dueDate || undefined,
                updatedAt: new Date()
            };
            
            // Persist without triggering complex cascades or duplicate checks
            await upsertTask(updatedTemplate, { 
                skipWorkflowEffects: true, 
                skipLinkEffects: true,
                skipDuplicateCheck: true 
            });
            
            // Log the migration event
            await appendEntityLog(EntityType.TASK, template.id, LogEventType.UPDATED, {
                migration: 'recurrent-dates-v1',
                recurrenceStart: updatedTemplate.recurrenceStart,
                recurrenceEnd: updatedTemplate.recurrenceEnd,
                reason: 'Standardizing recurrent boundaries (JIT Model)'
            });
            
            updatedCount++;
        } catch (err) {
            console.error(`[Migration] Failed to migrate template ${template.id}:`, err);
            errorCount++;
        }
    }
    
    console.log(`[Migration] Finished. Updated: ${updatedCount}, Errors: ${errorCount}`);
    return { updated: updatedCount, total: templates.length, errors: errorCount };
}
