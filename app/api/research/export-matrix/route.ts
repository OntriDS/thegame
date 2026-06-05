import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDelegationColorClass(statusScore: number): string {
    if (statusScore >= 90) return 'cyan';
    if (statusScore >= 70) return 'green';
    if (statusScore >= 50) return 'yellow';
    if (statusScore >= 30) return 'orange';
    if (statusScore >= 10) return 'red';
    return 'gray';
}

function formatMarkdownTable(tasks: any[], rules: any): string {
    let md = `### akiles-business-structure : task-delegation-matrix

| area-:-station > task | F | A | I | S | DPS | Current | Ideal Owner | Doc? | Feed? | Delegation | Status | Reasons |
| :--- | :-: | :-: | :-: | :-: | :-: | :--- | :--- | :-: | :-: | :--- | :--- | :--- |
`;

    let currentArea = '';

    tasks.forEach(task => {
        if (task.area !== currentArea) {
            currentArea = task.area;
            md += `| **${currentArea}** | | | | | | | | | | | | |\n`;
        }
        
        const dps = task.f + task.a + task.i + task.s;
        
        // This is a basic implementation of color/status based on your matrix logic
        // Ideally we fetch the same styling you have in UI, but this is a rough approximation for the markdown file
        
        const safeReason = (task.reasons || '').replace(/\|/g, '-');
        const safeCurrent = (task.currentOwner || '').replace(/\|/g, '-');
        const safeIdeal = (task.idealOwner || '').replace(/\|/g, '-');
        const safeDelegation = (task.delegation || '').replace(/\|/g, '-');
        
        // Placeholder status for now, as calculateStatus requires rules
        // For simplicity, we just dump the data
        md += `| *${task.station}* > ${task.task} | ${task.f} | ${task.a} | ${task.i} | ${task.s} | **${dps}** | ${safeCurrent} | ${safeIdeal} | ${task.doc} | ${task.feed} | **_${safeDelegation}_** | ${task.statusScore || ''}% | ${safeReason} |\n`;
    });

    return md;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request);
    
    const body = await request.json();
    const { tasks, rules } = body;
    
    const markdownContent = formatMarkdownTable(tasks, rules);
    
    // Send markdown back to the client so it can be downloaded locally, 
    // avoiding the Vercel ephemeral filesystem issue.
    return new NextResponse(markdownContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="tasks.delegation-matrix.md"',
      }
    });
  } catch (error) {
    console.error('Matrix export POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
