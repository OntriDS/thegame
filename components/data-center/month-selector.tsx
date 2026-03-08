'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface MonthSelectorProps {
    selectedMonth: string;      // MM-YY
    availableMonths: string[];  // sorted newest-first
    onChange: (month: string) => void;
}

/** Convert MM-YY to a readable label like "Mar 2026" */
function monthLabel(mmyy: string): string {
    const [mm, yy] = mmyy.split('-');
    const date = new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function MonthSelector({ selectedMonth, availableMonths, onChange }: MonthSelectorProps) {
    const months = availableMonths.length > 0 ? availableMonths : [selectedMonth];
    const currentIndex = months.indexOf(selectedMonth);

    const goToPrev = () => {
        // "Previous" = older = higher index (list is newest-first)
        if (currentIndex < months.length - 1) {
            onChange(months[currentIndex + 1]);
        }
    };

    const goToNext = () => {
        // "Next" = newer = lower index
        if (currentIndex > 0) {
            onChange(months[currentIndex - 1]);
        }
    };

    const isNewest = currentIndex === 0;
    const isOldest = currentIndex === months.length - 1;

    return (
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Log Month:</span>

            <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrev}
                disabled={isOldest}
                title="Older month"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select value={selectedMonth} onValueChange={onChange}>
                <SelectTrigger className="h-7 w-[120px] text-sm">
                    <SelectValue>{monthLabel(selectedMonth)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {months.map((m) => (
                        <SelectItem key={m} value={m}>
                            {monthLabel(m)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={goToNext}
                disabled={isNewest}
                title="Newer month"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            {months.length > 1 && (
                <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {months.length}
                </span>
            )}
        </div>
    );
}
