
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('🔥 [Project Status Sync API] Request received');

    if (!(await requireAdminAuth(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Read from the filesystem (The Source of Truth for this action)
        const filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
        console.log('🔥 [Project Status Sync API] Reading from:', filePath);

        let fileStatusData;
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            fileStatusData = JSON.parse(fileContent);
        } catch (fileError) {
            console.error('🔥 [Project Status Sync API] ❌ Error reading PROJECT-STATUS.json:', fileError);
            return NextResponse.json({ error: 'Failed to read local project status file' }, { status: 500 });
        }

        // 2. Write to the KV Store (if configured)
        if (process.env.UPSTASH_REDIS_REST_URL) {
            console.log('🔥 [Project Status Sync API] Syncing to KV (production/preview)');
            const { kvSet } = await import('@/data-store/kv');

            // Update the timestamp to now
            fileStatusData.lastUpdated = new Date().toISOString();

            await kvSet('data:project-status', fileStatusData);
            console.log('🔥 [Project Status Sync API] ✅ KV Synced');

            return NextResponse.json({
                success: true,
                message: 'Project Status successfully synced from file to database',
                data: fileStatusData
            });
        } else {
            console.log('🔥 [Project Status Sync API] No KV configured. Reading/Writing to file is the same.');
            return NextResponse.json({
                success: true,
                message: 'No external database configured. File is already the source of truth.',
                data: fileStatusData
            });
        }

    } catch (error) {
        console.error('🔥 [Project Status Sync API] ❌ Error syncing project status:', error);
        return NextResponse.json({ error: 'Failed to sync project status' }, { status: 500 });
    }
}
