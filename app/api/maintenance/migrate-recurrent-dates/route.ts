import { NextRequest, NextResponse } from 'next/server';
import { migrateRecurrentDates } from '@/workflows/maintenance/migrate-recurrent-dates.workflow';

/**
 * GET /api/maintenance/migrate-recurrent-dates
 * Triggers the migration of legacy template boundaries.
 */
export async function GET(req: NextRequest) {
    try {
        const results = await migrateRecurrentDates();
        return NextResponse.json({
            success: true,
            results
        });
    } catch (error: any) {
        console.error('[Maintenance] Migration error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
