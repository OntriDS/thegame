// lib/utils/recurrent-task-utils.ts
// Recurrent task management utilities

import { Task } from '@/types/entities';
import { TaskType, RecurrentFrequency } from '@/types/enums';
import { getAllTasks, upsertTask } from '@/data-store/repositories/task.repo';
import { removeTask as deleteTask } from '@/data-store/datastore';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { appendEntityLog } from '@/workflows/entities-logging';
import { EntityType, LogEventType } from '@/types/enums';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { v4 as uuid } from 'uuid';

export interface RecurrentTaskConfig {
  type: RecurrentFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  customDays?: Date[];
  stopsAfter?: {
    type: 'times' | 'date';
    value: number | Date;
  };
  repeatMode: 'after_done' | 'periodically';
}

/**
 * Creates a Recurrent Group (folder/container)
 */
export function createRecurrentGroup(
  name: string,
  description: string,
  station: string,
  parentId?: string | null
): Task {
  return {
    id: uuid(),
    name,
    description,
    type: TaskType.RECURRENT_GROUP,
    status: 'Not Started' as any, // Will be updated when we add the new status
    priority: 'Normal' as any,
    station: station as any,
    progress: 0,
    order: 0,
    parentId: parentId || null,
    isRecurrentGroup: true,
    isTemplate: false,
    cost: 0,
    revenue: 0,
    rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    isCollected: false,
    links: [] // ✅ Initialize links array (The Rosetta Stone)
  };
}

/**
 * Creates a Recurrent Template (sets frequency pattern)
 */
export function createRecurrentTemplate(
  name: string,
  description: string,
  station: string,
  parentId: string | null,
  frequencyConfig: FrequencyConfig
): Task {
  return {
    id: uuid(),
    name,
    description,
    type: TaskType.RECURRENT_TEMPLATE,
    status: 'Not Started' as any,
    priority: 'Normal' as any,
    station: station as any,
    progress: 0,
    order: 0,
    parentId,
    isRecurrentGroup: false,
    isTemplate: true,
    frequencyConfig,
    cost: 0,
    revenue: 0,
    rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    isCollected: false,
    links: [] // ✅ Initialize links array (The Rosetta Stone)
  };
}

/**
 * Spawns a Recurrent Instance from a template
 */
export function spawnRecurrentInstance(
  template: Task,
  dueDate: Date
): Task {
  return {
    ...template,
    id: uuid(),
    name: `${template.name} - ${dueDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
    type: TaskType.RECURRENT_INSTANCE,
    dueDate,
    parentId: template.id, // Instance points to its template
    isRecurrentGroup: false,
    isTemplate: false,
    frequencyConfig: undefined, // Instances don't have frequency config
    createdAt: new Date(),
    updatedAt: new Date(),
    links: [] // ✅ Initialize links array (The Rosetta Stone) - new instance gets fresh links
  };
}

/**
 * Calculates next due dates for a template based on frequency
 * Supports both simple recurrent respawning and template instance creation
 */
export function calculateNextDueDates(
  template: Task,
  startDate: Date = new Date(),
  count: number = 12,
  safetyLimit?: Date // Template's dueDate as safety limit
): Date[] {
  if (!template.frequencyConfig) {
    return [];
  }

  const dueDates: Date[] = [];
  let currentDate: Date;
  const config = template.frequencyConfig;

  // Normalize customDays to Date objects (defensive check - they might be strings from JSON)
  let normalizedCustomDays: Date[] = [];
  if (config.customDays && Array.isArray(config.customDays)) {
    normalizedCustomDays = config.customDays.map((day: any) => {
      if (day instanceof Date) {
        return day;
      }
      if (typeof day === 'string') {
        const date = new Date(day);
        return isNaN(date.getTime()) ? null : date;
      }
      return day;
    }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[];
  }

  // Use starting day from customDays if available, otherwise use startDate
  if (normalizedCustomDays.length > 0) {
    currentDate = new Date(normalizedCustomDays[0]);
  } else {
    currentDate = new Date(startDate);
  }

  // Use template's dueDate as safety limit if provided
  const endDate = safetyLimit || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

  for (let i = 0; i < count && currentDate <= endDate; i++) {
    // Check if current date is beyond safety limit BEFORE adding
    if (currentDate > endDate) {
      break;
    }

    dueDates.push(new Date(currentDate));
    
    // Move to next occurrence based on frequency type
    switch (config.type) {
      case RecurrentFrequency.DAILY:
        currentDate.setDate(currentDate.getDate() + (config.interval || 1));
        break;
      case RecurrentFrequency.WEEKLY:
        currentDate.setDate(currentDate.getDate() + 7 * (config.interval || 1));
        break;
      case RecurrentFrequency.MONTHLY:
        currentDate.setMonth(currentDate.getMonth() + (config.interval || 1));
        break;
      case RecurrentFrequency.CUSTOM:
        // For custom frequency, use the normalized custom days
        if (normalizedCustomDays.length > 0) {
          // Find next custom day
          const nextCustomDay = normalizedCustomDays.find((day: Date) => day.getTime() > currentDate.getTime());
          if (nextCustomDay) {
            currentDate = new Date(nextCustomDay);
          } else {
            // No more custom days, break
            break;
          }
        } else {
          // No custom days defined, break
          break;
        }
        break;
      case RecurrentFrequency.ONCE:
        // Only one occurrence
        break;
      case RecurrentFrequency.ALWAYS:
        // Continuous - create instances up to safety limit
        currentDate.setDate(currentDate.getDate() + (config.interval || 1));
        break;
      default:
        break;
    }
  }

  return dueDates;
}

/**
 * Spawns instances for a template up to a certain date
 * Uses template's dueDate as safety limit to prevent infinite tasks
 */
export function spawnInstancesForTemplate(
  template: Task,
  endDate?: Date // Optional end date, defaults to template's dueDate
): Task[] {
  // Use template's dueDate as safety limit if no endDate provided
  const safetyLimit = endDate || template.dueDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  
  const dueDates = calculateNextDueDates(template, new Date(), 12, safetyLimit);
  const instances: Task[] = [];

  for (const dueDate of dueDates) {
    if (dueDate <= safetyLimit) {
      instances.push(spawnRecurrentInstance(template, dueDate));
    }
  }

  return instances;
}

/**
 * Gets all tasks in a recurrent hierarchy
 */
export async function getRecurrentHierarchy(parentId: string): Promise<{
  parent: Task | null;
  templates: Task[];
  instances: Task[];
}> {
  const tasks = await getAllTasks();
  
  const parent = tasks.find(t => t.id === parentId && t.isRecurrentGroup) || null;
  const templates = tasks.filter(t => t.parentId === parentId && t.isTemplate);
  const instances = tasks.filter(t => t.parentId === parentId && t.type === TaskType.RECURRENT_INSTANCE);

  return { parent, templates, instances };
}

/**
 * Archives completed instances (for monthly close)
 */
export async function archiveCompletedInstances(parentId: string): Promise<Task[]> {
  const tasks = await getAllTasks();
  const instances = tasks.filter((t: Task) =>
    t.parentId === parentId &&
    t.type === TaskType.RECURRENT_INSTANCE &&
    (t.status === 'Done' || t.status === 'Collected')
  );

  // Update instances to collected status (Archived)
  const updatedInstances: Task[] = [];
  for (const instance of instances) {
    const updated = { ...instance, status: 'Collected' as any, isCollected: true, updatedAt: new Date() } as Task;
    await upsertTask(updated);
    updatedInstances.push(updated);
  }

  return updatedInstances;
}

/**
 * Handles template instance creation when a template is saved
 * This function should be called when a Recurrent Template is created or updated
 */
export async function handleTemplateInstanceCreation(template: Task): Promise<Task[]> {
  if (template.type !== TaskType.RECURRENT_TEMPLATE) {
    return [];
  }

  // Require template to have a due date for safety limit
  if (!template.dueDate) {
    console.warn(`Template "${template.name}" has no due date. Cannot create instances without safety limit.`);
    return [];
  }

  // Normalize frequencyConfig.customDays to Date objects (defensive check - they might be strings from JSON)
  let normalizedTemplate = { ...template };
  if (normalizedTemplate.frequencyConfig?.customDays && Array.isArray(normalizedTemplate.frequencyConfig.customDays)) {
    normalizedTemplate.frequencyConfig = {
      ...normalizedTemplate.frequencyConfig,
      customDays: normalizedTemplate.frequencyConfig.customDays.map((day: any) => {
        if (day instanceof Date) {
          return day;
        }
        if (typeof day === 'string') {
          const date = new Date(day);
          return isNaN(date.getTime()) ? null : date;
        }
        return day;
      }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[]
    };
  }

  // Get existing instances for this template
  const tasks = await getAllTasks();
  const existingInstances = tasks.filter(
    (t: Task) => t.parentId === template.id && t.type === TaskType.RECURRENT_INSTANCE
  );

  // Generate new instances based on template's frequency
  const newInstances = spawnInstancesForTemplate(normalizedTemplate);

  // Filter out instances that already exist (by due date)
  const existingDueDates = new Set(existingInstances.map((i: Task) => i.dueDate?.getTime()));
  const uniqueNewInstances = newInstances.filter(
    (instance: Task) => !existingDueDates.has(instance.dueDate?.getTime())
  );

  // Save new instances
  for (const instance of uniqueNewInstances) {
    await upsertTask(instance);
  }

  return uniqueNewInstances;
}

/**
 * Deletes a recurrent group and all its child templates, instances, and nested groups.
 */
export async function deleteGroupCascade(groupId: string): Promise<number> {
  const tasks = await getAllTasks();
  const toDelete = new Set<string>([groupId]);

  // Recursive function to collect all descendants
  const collectDescendants = (parentId: string) => {
    // Find all child groups (nested groups)
    const childGroups = tasks.filter((t: Task) =>
      t.parentId === parentId && t.type === TaskType.RECURRENT_GROUP
    );
    
    // Find all child templates
    const childTemplates = tasks.filter((t: Task) =>
      t.parentId === parentId && t.type === TaskType.RECURRENT_TEMPLATE
    );

    // Add child groups and recursively process them
    childGroups.forEach(g => {
      toDelete.add(g.id);
      collectDescendants(g.id); // Recursively process nested groups
    });
    
    // Add templates
    childTemplates.forEach(t => toDelete.add(t.id));

    // Find all instances of those templates
    const templateIds = childTemplates.map(t => t.id);
    const childInstances = tasks.filter((t: Task) =>
      templateIds.includes(t.parentId || '') && t.type === TaskType.RECURRENT_INSTANCE
    );
    childInstances.forEach(i => toDelete.add(i.id));
  };

  // Start recursive collection from the root group
  collectDescendants(groupId);

  // Delete all collected tasks
  for (const taskId of toDelete) {
    await deleteTask(taskId);
  }

  return toDelete.size;
}

/**
 * Deletes a template and all its direct instances.
 */
export async function deleteTemplateCascade(templateId: string): Promise<number> {
  const tasks = await getAllTasks();
  const toDelete = tasks.filter((t: Task) => t.id === templateId || (t.parentId === templateId && t.type === TaskType.RECURRENT_INSTANCE));
  for (const t of toDelete) {
    await deleteTask(t.id);
  }
  return toDelete.length;
}

/**
 * Cascades status change from template to its instances
 */
export async function cascadeStatusToInstances(
  templateId: string,
  newStatus: string,
  oldStatus: string
): Promise<{ updated: Task[], count: number }> {
  // Check effects registry to prevent duplicate cascade operations
  const effectKey = `task:${templateId}:cascadeStatus:${newStatus}`;
  if (await hasEffect(effectKey)) {
    console.log(`[cascadeStatusToInstances] Cascade already applied for template ${templateId} to ${newStatus}`);
    return { updated: [], count: 0 };
  }

  const tasks = await getAllTasks();
  const instances = tasks.filter((t: Task) =>
    t.parentId === templateId &&
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== newStatus // Only update instances that don't already have the target status
  );

  const updatedInstances: Task[] = [];
  for (const instance of instances) {
    const updated = { 
      ...instance, 
      status: newStatus as any, 
      updatedAt: new Date() 
    } as Task;
    await upsertTask(updated);
    updatedInstances.push(updated);

    // Log status change for each instance with cascade context
    await appendEntityLog(EntityType.TASK, instance.id, LogEventType.UPDATED, {
      oldStatus: instance.status,
      newStatus: newStatus,
      name: instance.name,
      cascadedFrom: templateId,
      transition: `${instance.status} → ${newStatus}`,
      changedAt: new Date().toISOString()
    });
  }

  // Mark effect to prevent duplicate operations
  await markEffect(effectKey);
  console.log(`[cascadeStatusToInstances] ✅ Cascaded ${updatedInstances.length} instances to ${newStatus}`);

  return { updated: updatedInstances, count: updatedInstances.length };
}

/**
 * Gets count of instances that are not at the target status
 */
export async function getUndoneInstancesCount(templateId: string, targetStatus: string): Promise<number> {
  const tasks = await getAllTasks();
  return tasks.filter(t => 
    t.parentId === templateId && 
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== targetStatus
  ).length;
}

/**
 * Reverses cascade status change from template to its instances (uncascade)
 */
export async function uncascadeStatusFromInstances(
  templateId: string,
  revertToStatus: string
): Promise<{ reverted: Task[], count: number }> {
  // Check effects registry to prevent duplicate uncascade operations
  const effectKey = `task:${templateId}:uncascadeStatus:${revertToStatus}`;
  if (await hasEffect(effectKey)) {
    console.log(`[uncascadeStatusFromInstances] Uncascade already applied for template ${templateId} to ${revertToStatus}`);
    return { reverted: [], count: 0 };
  }

  const tasks = await getAllTasks();
  const instances = tasks.filter(t => 
    t.parentId === templateId && 
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== revertToStatus // Only revert instances that don't already have the target status
  );

  const revertedInstances: Task[] = [];
  for (const instance of instances) {
    const updated = { 
      ...instance, 
      status: revertToStatus as any, 
      updatedAt: new Date() 
    } as Task;
    await upsertTask(updated);
    revertedInstances.push(updated);

    // Log status reversal for each instance with uncascade context
    await appendEntityLog(EntityType.TASK, instance.id, LogEventType.UPDATED, {
      oldStatus: instance.status,
      newStatus: revertToStatus,
      name: instance.name,
      uncascadedFrom: templateId,
      transition: `${instance.status} → ${revertToStatus}`,
      changedAt: new Date().toISOString()
    });
  }

  // Mark effect to prevent duplicate operations
  await markEffect(effectKey);
  console.log(`[uncascadeStatusFromInstances] ✅ Reverted ${revertedInstances.length} instances to ${revertToStatus}`);

  return { reverted: revertedInstances, count: revertedInstances.length };
}
