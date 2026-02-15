
import { NextResponse, NextRequest } from 'next/server';
import { getAllTasks, upsertTask } from '@/data-store/datastore';
import { kvSAdd, kvSMembers, kvSRem, kvScan } from '@/data-store/kv';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
import { TaskStatus } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fix = searchParams.get('fix') === 'true';

        console.log(`[Diagnostic] Starting Comprehensive Task Index Check. Fix mode: ${fix}`);

        const allTasks = await getAllTasks();
        const collectedTasks = allTasks.filter(t => t.isCollected || t.status === TaskStatus.COLLECTED);

        const report = {
            totalTasks: allTasks.length,
            collectedTasksCount: collectedTasks.length,
            missingFromIndex: 0,
            phantomInIndex: 0,
            fixedMissing: 0,
            fixedPhantom: 0,
            fixedDoneAt: 0,
            details: [] as string[]
        };

        // 3. (NEW) Check for Tasks with Status=Done but NO doneAt
        // This fixes the "tasks that are done status but dont have a doneAt" issue
        for (const task of allTasks) {
            if (task.status === TaskStatus.DONE && !task.doneAt) {
                const fallbackDate = task.updatedAt || new Date();
                report.details.push(`[MISSING DONE_AT] Task ${task.id} (${task.name}) is Done but has no date. Fallback to: ${fallbackDate.toISOString()}`);

                if (fix) {
                    const updatedTask = { ...task, doneAt: fallbackDate };
                    await upsertTask(updatedTask);
                    report.fixedDoneAt++;
                }
            }
        }

        // 1. Check for Tasks that are collected but MISSING from index
        for (const task of collectedTasks) {
            let collectedAt = task.collectedAt;
            if (!collectedAt) {
                if (task.doneAt) collectedAt = calculateClosingDate(task.doneAt);
                else if (task.createdAt) collectedAt = calculateClosingDate(task.createdAt);
                else collectedAt = calculateClosingDate(new Date());
            }

            const dateObj = new Date(collectedAt);
            const monthKey = formatMonthKey(dateObj);
            const indexKey = `index:tasks:collected:${monthKey}`;

            // Inefficient but safe given current KV type definitions
            const members = await kvSMembers(indexKey);
            const isMember = members.includes(task.id);

            if (!isMember) {
                report.missingFromIndex++;
                report.details.push(`[MISSING] Task ${task.id} (${task.name}) should be in ${indexKey} but isn't.`);

                if (fix) {
                    await kvSAdd(indexKey, task.id);
                    report.fixedMissing++;
                }
            }
        }

        // 2. Check for PHANTOM entries in the index (Index has ID, but Task is not collected or wrong date)
        // Scan for all collected indices
        const indexKeys = await kvScan('index:tasks:collected:');

        for (const key of indexKeys) {
            const members = await kvSMembers(key);
            const monthKeyOfIndex = key.replace('index:tasks:collected:', '');

            for (const taskId of members) {
                const task = allTasks.find(t => t.id === taskId);

                let isPhantom = false;
                let reason = '';

                if (!task) {
                    isPhantom = true;
                    reason = `Task does not exist`;
                } else {
                    const isCollected = task.isCollected || task.status === TaskStatus.COLLECTED;
                    if (!isCollected) {
                        isPhantom = true;
                        reason = `Task exists but is NOT collected (Status: ${task.status})`;
                    } else {
                        // Check if Date matches
                        let collectedAt = task.collectedAt;
                        if (!collectedAt) {
                            if (task.doneAt) collectedAt = calculateClosingDate(task.doneAt);
                            else if (task.createdAt) collectedAt = calculateClosingDate(task.createdAt);
                            else collectedAt = calculateClosingDate(new Date());
                        }
                        const correctMonthKey = formatMonthKey(new Date(collectedAt));
                        if (correctMonthKey !== monthKeyOfIndex) {
                            isPhantom = true;
                            reason = `Task belongs in ${correctMonthKey}, not ${monthKeyOfIndex}`;
                        }
                    }
                }

                if (isPhantom) {
                    report.phantomInIndex++;
                    report.details.push(`[PHANTOM] ${key} -> ID ${taskId}: ${reason}`);

                    if (fix) {
                        await kvSRem(key, taskId);
                        report.fixedPhantom++;
                    }
                }
            }
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('[Diagnostic] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
