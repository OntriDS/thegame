'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export type LogSortOption =
  | 'date-newest'
  | 'date-oldest'
  | 'name-asc'
  | 'name-desc'
  | 'event-asc'
  | 'event-desc'
  | 'station-asc'
  | 'station-desc';

interface LogSortDropdownProps {
  value: LogSortOption;
  onChange: (value: LogSortOption) => void;
  className?: string;
}

export function LogSortDropdown({ value, onChange, className }: LogSortDropdownProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-newest">Date: Newest First</SelectItem>
          <SelectItem value="date-oldest">Date: Oldest First</SelectItem>
          <SelectItem value="name-asc">Name: A-Z</SelectItem>
          <SelectItem value="name-desc">Name: Z-A</SelectItem>
          <SelectItem value="event-asc">Event: A-Z</SelectItem>
          <SelectItem value="event-desc">Event: Z-A</SelectItem>
          <SelectItem value="station-asc">Station: A-Z</SelectItem>
          <SelectItem value="station-desc">Station: Z-A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function sortLogEntries(entries: any[], sortOption: LogSortOption): any[] {
  const sortedEntries = [...entries];

  switch (sortOption) {
    case 'date-newest':
      return sortedEntries.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.displayDate || 0).getTime();
        const dateB = new Date(b.timestamp || b.displayDate || 0).getTime();
        return dateB - dateA;
      });

    case 'date-oldest':
      return sortedEntries.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.displayDate || 0).getTime();
        const dateB = new Date(b.timestamp || b.displayDate || 0).getTime();
        return dateA - dateB;
      });

    case 'name-asc':
      return sortedEntries.sort((a, b) => {
        const nameA = (a.displayName || a.name || a.taskName || a.recordName || '').toLowerCase();
        const nameB = (b.displayName || b.name || b.taskName || b.recordName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case 'name-desc':
      return sortedEntries.sort((a, b) => {
        const nameA = (a.displayName || a.name || a.taskName || a.recordName || '').toLowerCase();
        const nameB = (b.displayName || b.name || b.taskName || b.recordName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      });

    case 'event-asc':
      return sortedEntries.sort((a, b) => {
        const eventA = (a.event || a.status || '').toLowerCase();
        const eventB = (b.event || b.status || '').toLowerCase();
        return eventA.localeCompare(eventB);
      });

    case 'event-desc':
      return sortedEntries.sort((a, b) => {
        const eventA = (a.event || a.status || '').toLowerCase();
        const eventB = (b.event || b.status || '').toLowerCase();
        return eventB.localeCompare(eventA);
      });

    case 'station-asc':
      return sortedEntries.sort((a, b) => {
        const stationA = (a.station || '').toLowerCase();
        const stationB = (b.station || '').toLowerCase();
        return stationA.localeCompare(stationB);
      });

    case 'station-desc':
      return sortedEntries.sort((a, b) => {
        const stationA = (a.station || '').toLowerCase();
        const stationB = (b.station || '').toLowerCase();
        return stationB.localeCompare(stationA);
      });

    default:
      return sortedEntries;
  }
}
