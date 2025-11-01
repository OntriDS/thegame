'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Eye, EyeOff, List } from 'lucide-react';

export type LogViewFilterValue = 'all' | 'active' | 'deleted';

interface LogViewFilterProps {
  value: LogViewFilterValue;
  onChange: (value: LogViewFilterValue) => void;
}

/**
 * LogViewFilter - Tri-state filter for log entries
 * 
 * Options:
 * - "active": Show only non-deleted entries (default)
 * - "deleted": Show only deleted entries
 * - "all": Show all entries
 */
export function LogViewFilter({ value, onChange }: LogViewFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Active
          </div>
        </SelectItem>
        <SelectItem value="deleted">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            Deleted
          </div>
        </SelectItem>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

