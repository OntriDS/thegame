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
    selectedMonth: string;
    availableMonths: string[];
    onChange: (month: string) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
}

const monthLabel = (mmyy: string) => {
    if (!mmyy || !mmyy.includes('-')) return mmyy;
    const [mm, yy] = mmyy.split('-');
    const date = new Date(yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10), parseInt(mm, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function MonthSelector({ 
    selectedMonth, 
    availableMonths, 
    onChange, 
    label = "Month:", 
    className = "",
    disabled = false
}: MonthSelectorProps) {
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
        <div className={`flex items-center gap-2 ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {label}
            </span>

            <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrev}
                disabled={isOldest || disabled}
                title="Older month"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select value={selectedMonth} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className="h-7 w-[130px] text-xs font-semibold">
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
                <span className="text-[10px] text-muted-foreground tabular-nums">
                    {currentIndex + 1}/{months.length}
                </span>
            )}
        </div>
    );
}
