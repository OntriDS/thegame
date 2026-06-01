import { getAllSales, getSalesForMonth } from '@/data-store/datastore';
import { toUTC, endOfDayUTC, startOfMonthUTC, endOfMonthUTC } from '@/lib/utils/utc-utils';

function isMonthScoped(startRaw: string, endRaw: string) {
  try {
    const start = toUTC(startRaw);
    const end = endOfDayUTC(toUTC(endRaw));
    const monthStart = startOfMonthUTC(start);
    const monthEnd = endOfMonthUTC(start);
    if (start.getTime() === monthStart.getTime() && end.getTime() === monthEnd.getTime() && start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
      return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
    }
  } catch {}
  return null;
}

export async function execute(parameters: any) {
  let sales = await getAllSales();
  const dateRange = parameters.dateRange;
  if (dateRange && dateRange.start && dateRange.end) {
    const monthly = isMonthScoped(dateRange.start, dateRange.end);
    if (monthly) {
      sales = await getSalesForMonth(monthly.year, monthly.month);
    } else {
      const start = toUTC(dateRange.start).getTime();
      const end = endOfDayUTC(toUTC(dateRange.end)).getTime();
      if (start <= end) {
         sales = sales.filter(s => {
           try {
             const ts = toUTC(s.saleDate).getTime();
             return ts >= start && ts <= end;
           } catch { return false; }
         });
      }
    }
  }
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  let slice = sales;
  if (offset > 0 || limit) {
    slice = sales.slice(offset, limit ? offset + limit : undefined);
  }
  return { sales: slice, count: slice.length, total: sales.length, offset, limit, hasMore: limit ? offset + limit < sales.length : false };
}