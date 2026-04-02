import { NextResponse } from 'next/server';
import { getFinancialsForMonth, getAllFinancials } from '@/data-store/datastore';
import { aggregateRecordsByStation, calculateTotals } from '@/lib/utils/financial-utils';
import { getCompanyAreas } from '@/lib/utils/business-structure-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { CompanyMonthlySummary, PersonalMonthlySummary } from '@/types/entities';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        const now = new Date();
        const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);

        // 1. Strict Parsing and Validation
        let year = yearParam ? parseInt(yearParam, 10) : adjustedNow.getFullYear();
        let month = monthParam ? parseInt(monthParam, 10) : adjustedNow.getMonth() + 1;

        // Normalize year
        if (year < 100) year += 2000;

        // Bounds validation
        if (isNaN(year) || year < 2024 || year > 2100) year = adjustedNow.getFullYear();
        if (isNaN(month) || month < 1 || month > 12) month = adjustedNow.getMonth() + 1;

        // 2. Optimized Unified Fetching (Active + Archive)
        const records = await getFinancialsForMonth(year, month);

        const companyRecords = records.filter(r => r.type === 'company');
        const personalRecords = records.filter(r => r.type === 'personal');

        // Aggregate company records
        const companyStations = getCompanyAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
        const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
        const companyTotals = calculateTotals(companyBreakdown);

        // Aggregate personal records
        const personalStations = BUSINESS_STRUCTURE.PERSONAL;
        const personalBreakdown = aggregateRecordsByStation(personalRecords, personalStations);
        const personalTotals = calculateTotals(personalBreakdown);

        const companySummary: CompanyMonthlySummary = {
            year,
            month,
            totalRevenue: companyTotals.totalRevenue,
            totalCost: companyTotals.totalCost,
            netCashflow: companyTotals.net,
            totalJungleCoins: companyTotals.totalJungleCoins,
            categoryBreakdown: companyBreakdown
        };

        const personalSummary: PersonalMonthlySummary = {
            year,
            month,
            totalRevenue: personalTotals.totalRevenue,
            totalCost: personalTotals.totalCost,
            netCashflow: personalTotals.net,
            totalJungleCoins: personalTotals.totalJungleCoins,
            categoryBreakdown: personalBreakdown
        };

        return NextResponse.json({
            companySummary,
            personalSummary,
            aggregatedFinancialData: companyTotals, // For backward compat with UI expectations if needed
            aggregatedCategoryData: { categoryBreakdown: companyBreakdown }
        });

    } catch (error) {
        console.error('Failed to get financial summary:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
