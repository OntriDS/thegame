import { NextResponse } from 'next/server';
import { getFinancialsForMonth, getAllFinancials } from '@/data-store/datastore';
import { aggregateRecordsByStation, calculateTotals } from '@/lib/utils/financial-utils';
import { getCompanyAreas } from '@/lib/utils/business-structure-utils';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { CompanyMonthlySummary, PersonalMonthlySummary } from '@/types/entities';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        let records;
        let year: number;
        let month: number;

        if (monthParam && yearParam) {
            year = parseInt(yearParam);
            month = parseInt(monthParam);
            records = await getFinancialsForMonth(year, month);
        } else {
            // Fallback: If no date params provided, fetch all records.
            // This matches the behavior required for complete historical aggregation.
            records = await getAllFinancials();
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }

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
