'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Pin,
  Archive,
  Tag,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState } from 'react';
import { NOTE_TAGS } from '@/types/enums';
import { Note } from '@/types/entities';

interface NotesSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'date' | 'title';
  onSortChange: (sortBy: 'date' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  showPinnedOnly: boolean;
  onTogglePinnedOnly: () => void;
  showClosedOnly: boolean;
  onToggleClosedOnly: () => void;
  showHiddenOnly: boolean;
  onToggleHiddenOnly: () => void;
  showHiddenNotes: boolean;
  onToggleShowHiddenNotes: () => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  totalNotes: number;
  filteredNotes: number;
  notes: Note[];
}

export function NotesSearchFilter({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  showPinnedOnly,
  onTogglePinnedOnly,
  showClosedOnly,
  onToggleClosedOnly,
  showHiddenOnly,
  onToggleHiddenOnly,
  showHiddenNotes,
  onToggleShowHiddenNotes,
  selectedTag,
  onTagChange,
  totalNotes,
  filteredNotes,
  notes
}: NotesSearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Extract all unique tags from notes (both predefined and custom)
  const allTags = Array.from(new Set(
    notes.flatMap(note => note.tags || [])
  )).sort();

  // Combine predefined tags with custom tags, removing duplicates
  const availableTags = Array.from(new Set([
    ...NOTE_TAGS,
    ...allTags
  ])).sort();

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredNotes} of {totalNotes} notes
          </Badge>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          {/* Sort Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort by</label>
            <div className="flex gap-2">
              {(['date', 'title'] as const).map((option) => (
                <Button
                  key={option}
                  variant={sortBy === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSortChange(option)}
                  className="capitalize"
                >
                  {option}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Filters</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={showPinnedOnly ? "default" : "outline"}
                size="sm"
                onClick={onTogglePinnedOnly}
                className="flex items-center gap-1"
              >
                <Pin className="h-3 w-3" />
                Pinned
              </Button>
              <Button
                variant={showClosedOnly ? "default" : "outline"}
                size="sm"
                onClick={onToggleClosedOnly}
                className="flex items-center gap-1"
              >
                <Archive className="h-3 w-3" />
                Closed
              </Button>
              <Button
                variant={showHiddenOnly ? "default" : "outline"}
                size="sm"
                onClick={onToggleHiddenOnly}
                className="flex items-center gap-1"
              >
                {showHiddenOnly ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Hidden
              </Button>
            </div>
          </div>

          {/* Show Hidden Notes Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Options</label>
            <div className="flex items-center gap-2">
              <Button
                variant={showHiddenNotes ? "default" : "outline"}
                size="sm"
                onClick={onToggleShowHiddenNotes}
                className="flex items-center gap-1"
              >
                {showHiddenNotes ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {showHiddenNotes ? 'Hide Blurred' : 'Show Hidden'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {showHiddenNotes ? 'Hidden notes are visible but blurred' : 'Hidden notes are completely hidden'}
              </span>
            </div>
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Tag</label>
            <SearchableSelect
              value={selectedTag}
              onValueChange={onTagChange}
              placeholder="All Tags"
              options={[
                { value: '', label: 'All Tags' },
                // Business Structure tags
                ...NOTE_TAGS.map(tag => ({ 
                  value: tag, 
                  label: tag,
                  group: 'Business Structure'
                })),
                // Custom tags (others)
                ...allTags.filter(tag => !NOTE_TAGS.includes(tag as any)).map(tag => ({ 
                  value: tag, 
                  label: tag,
                  group: 'Others'
                }))
              ]}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
