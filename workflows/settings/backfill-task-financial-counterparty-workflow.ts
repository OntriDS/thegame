// workflows/settings/backfill-task-financial-counterparty-workflow.ts
// One-time repair workflow for completed tasks whose financial rows miss counterparty metadata.

import type { CustomerCounterpartyRole, FinancialRecord } from '@/types/entities';
import { CharacterRole, EntityType, LinkType, TaskStatus } from '@/types/enums';
import { getAllTasks, getFinancialById, getFinancialsBySourceTaskId, upsertFinancial } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { resolveCounterpartyForTask, withResolvedTaskCounterparty } from '@/workflows/task-counterparty-resolution';
import type { SettingsResult } from './reset-data-workflow';

interface BackfillSummary {
  scannedTasks: number;
  completedTasks: number;
  resolvedFromTaskField: number;
  resolvedFromTaskCharacterLink: number;
  resolvedFromSaleFallback: number;
  unresolvedTasks: number;
  recordsFound: number;
  recordsUpdated: number;
  recordsAlreadyValid: number;
  errors: string[];
}

const loadFinancialRowsForTask = async (taskId: string): Promise<FinancialRecord[]> => {
  const bySourceTask = await getFinancialsBySourceTaskId(taskId);
  if (bySourceTask.length > 0) return bySourceTask;

  const fallbackRows: FinancialRecord[] = [];
  const directId = `finrec-${taskId}`;
  const direct = await getFinancialById(directId);
  if (direct) fallbackRows.push(direct);

  const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
  const taskFinrecLinks = links.filter(
    (link) => link.linkType === LinkType.TASK_FINREC &&
      link.target.type === EntityType.FINANCIAL &&
      typeof link.target.id === 'string'
  );

  for (const link of taskFinrecLinks) {
    const record = await getFinancialById(link.target.id);
    if (record) fallbackRows.push(record);
  }

  const deduped = new Map<string, FinancialRecord>();
  for (const record of [...bySourceTask, ...fallbackRows]) {
    deduped.set(record.id, record);
  }
  return Array.from(deduped.values());
};

export class BackfillTaskFinancialCounterpartyWorkflow {
  static async execute(): Promise<SettingsResult> {
    const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
    const isServer = typeof window === 'undefined';
    const summary: BackfillSummary = {
      scannedTasks: 0,
      completedTasks: 0,
      resolvedFromTaskField: 0,
      resolvedFromTaskCharacterLink: 0,
      resolvedFromSaleFallback: 0,
      unresolvedTasks: 0,
      recordsFound: 0,
      recordsUpdated: 0,
      recordsAlreadyValid: 0,
      errors: [],
    };

    try {
      const tasks = await getAllTasks();
      const completedTasks = tasks.filter((task) =>
        task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED
      );
      summary.completedTasks = completedTasks.length;

      for (const task of completedTasks) {
        summary.scannedTasks += 1;
        try {
          const taskResolution = await resolveCounterpartyForTask(task);
          switch (taskResolution.source) {
            case 'task-field':
              summary.resolvedFromTaskField += 1;
              break;
            case 'task-character-link':
              summary.resolvedFromTaskCharacterLink += 1;
              break;
            case 'sale-fallback':
              summary.resolvedFromSaleFallback += 1;
              break;
            default:
              summary.unresolvedTasks += 1;
              break;
          }

          const resolvedTask = withResolvedTaskCounterparty(task, taskResolution);
          const rows = await loadFinancialRowsForTask(task.id);
          if (rows.length === 0) {
            console.log(`[BackfillTaskFinancialCounterpartyWorkflow] No financial rows for completed task ${task.id}`);
            continue;
          }

          summary.recordsFound += rows.length;

          for (const row of rows) {
            const needsCustomerId = row.customerCharacterId == null && !!resolvedTask.customerCharacterId;
            const needsCustomerRole = !!resolvedTask.customerCharacterId && row.customerCharacterRole == null;
            const needsRoleMismatch = (
              row.customerCharacterId === resolvedTask.customerCharacterId &&
              row.customerCharacterRole !== resolvedTask.customerCharacterRole
            );

            const shouldUpdate = needsCustomerId || needsCustomerRole || needsRoleMismatch;
            if (!shouldUpdate) {
              summary.recordsAlreadyValid += 1;
              continue;
            }

            if (!resolvedTask.customerCharacterId) {
              summary.recordsAlreadyValid += 1;
              continue;
            }

            const nextRole: CustomerCounterpartyRole = resolvedTask.customerCharacterRole ?? CharacterRole.CUSTOMER;
            const nextRecord = {
              ...row,
              customerCharacterId: resolvedTask.customerCharacterId,
              customerCharacterRole: nextRole,
              updatedAt: getUTCNow()
            };

            await upsertFinancial(nextRecord);
            summary.recordsUpdated += 1;
            console.log(
              `[BackfillTaskFinancialCounterpartyWorkflow] Updated financial ${row.id} for task ${task.id} ` +
              `counterparty ${resolvedTask.customerCharacterId}/${nextRole}`
            );
          }
        } catch (error) {
          const errorMessage = `Task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          summary.errors.push(errorMessage);
          console.error(`[BackfillTaskFinancialCounterpartyWorkflow] ⚠️ ${errorMessage}`, error);
        }
      }

      const total = isServer ? 'server' : 'client';
      const success = summary.errors.length === 0;
      const message = success
        ? `Backfilled ${summary.recordsUpdated} financial counterparty links across ${summary.completedTasks} completed tasks`
        : `Backfill completed with ${summary.errors.length} errors`;

      return {
        success,
        message,
        data: {
          results: [
            `completedTasks=${summary.completedTasks}`,
            `recordsFound=${summary.recordsFound}`,
            `recordsUpdated=${summary.recordsUpdated}`,
            `recordsAlreadyValid=${summary.recordsAlreadyValid}`,
            `resolvedFromTaskField=${summary.resolvedFromTaskField}`,
            `resolvedFromTaskCharacterLink=${summary.resolvedFromTaskCharacterLink}`,
            `resolvedFromSaleFallback=${summary.resolvedFromSaleFallback}`,
            `unresolvedTasks=${summary.unresolvedTasks}`,
            `scannedTasks=${summary.scannedTasks}`,
            `environment=${isKV ? 'kv' : 'local'}`,
            `context=${total}`
          ],
          errors: summary.errors,
          mode: 'backfill-task-financial-counterparty',
          environment: isKV ? 'kv' : 'local'
        }
      };
    } catch (error) {
      const message = `Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[BackfillTaskFinancialCounterpartyWorkflow] ❌', message, error);
      return {
        success: false,
        message,
        data: {
          results: [],
          errors: [message],
          mode: 'backfill-task-financial-counterparty',
          environment: isKV ? 'kv' : 'local'
        }
      };
    }
  }
}
