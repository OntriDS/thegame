'use client';

import * as React from 'react';
import { ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{
    value: string;
    label: string;
    group?: string;
    category?: string; // For automatic category grouping
  }>;
  className?: string;
  disabled?: boolean;
  autoGroupByCategory?: boolean; // Enable automatic category grouping
  getCategoryForValue?: (value: string) => string; // Function to get category for a value
  persistentCollapsible?: boolean; // Enable persistent collapsible state per instance
  instanceId?: string; // Unique ID for persistent state
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  disabled = false,
  autoGroupByCategory = false,
  getCategoryForValue,
  persistentCollapsible = false,
  instanceId,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Persistent collapsible state with localStorage - collapsed by default
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  // Group options by group property or category, maintaining enum order
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, Array<{ value: string; label: string }>> = {};
    const query = searchQuery.toLowerCase().trim();
    
    // Process options in the order they appear (maintaining enum order)
    options.forEach((option) => {
      let group: string;
      
      if (autoGroupByCategory && getCategoryForValue) {
        // Use automatic category grouping
        group = getCategoryForValue(option.value) || option.category || 'Other';
      } else {
        // Use explicit group property
        group = option.group || option.category || 'Other';
      }
      
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push({ value: option.value, label: option.label });
    });
    
    // Automatically add "None" option at the bottom if:
    // 1. No options exist, OR
    // 2. No explicit "None" option exists (value is empty string or 'none')
    const hasNoneOption = options.some(option => 
      option.value === '' || option.value === 'none' || option.value === 'none:'
    );
    
    if (options.length === 0 || !hasNoneOption) {
      if (!groups['None']) {
        groups['None'] = [];
      }
      groups['None'].push({ value: '', label: 'None' });
    }
    
    // Filter groups and options based on search query
    if (query) {
      const filteredGroups: Record<string, Array<{ value: string; label: string }>> = {};
      
      Object.entries(groups).forEach(([groupName, groupOptions]) => {
        const matchingOptions = groupOptions.filter(option => 
          option.label.toLowerCase().includes(query)
        );
        
        if (matchingOptions.length > 0) {
          filteredGroups[groupName] = matchingOptions;
        }
      });
      
      return filteredGroups;
    }
    
    return groups;
  }, [options, autoGroupByCategory, getCategoryForValue, searchQuery]);

  const selectedOption = options.find((option) => option.value === value);

  // Initialize collapsed state on first use (collapse all groups by default)
  React.useEffect(() => {
    if (persistentCollapsible && instanceId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`searchable-select-collapsed-${instanceId}`);
      if (!saved) {
        // First time: collapse all groups by default
        const allGroups = Object.keys(groupedOptions);
        if (allGroups.length > 0) {
          setCollapsedGroups(new Set(allGroups));
        }
      }
    }
  }, [groupedOptions, persistentCollapsible, instanceId]);

  // Load localStorage values after hydration to prevent SSR mismatches
  React.useEffect(() => {
    if (persistentCollapsible && instanceId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`searchable-select-collapsed-${instanceId}`);
      if (saved) {
        try {
          setCollapsedGroups(new Set(JSON.parse(saved)));
        } catch {
          // Keep default empty Set
        }
      }
    }
  }, [persistentCollapsible, instanceId]);

  // Auto-expand groups with matches when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const groupsWithMatches = Object.keys(groupedOptions);
      setCollapsedGroups(prev => {
        const newCollapsed = new Set(prev);
        groupsWithMatches.forEach(group => newCollapsed.delete(group));
        return newCollapsed;
      });
    } else {
      // Reset to saved collapsed state when search is cleared
      if (persistentCollapsible && instanceId && typeof window !== 'undefined') {
        const saved = localStorage.getItem(`searchable-select-collapsed-${instanceId}`);
        if (saved) {
          setCollapsedGroups(new Set(JSON.parse(saved)));
        }
      }
    }
  }, [searchQuery, groupedOptions, persistentCollapsible, instanceId]);

  // Toggle group collapse state with persistence
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      
      // Save to localStorage if persistent
      if (persistentCollapsible && instanceId && typeof window !== 'undefined') {
        localStorage.setItem(`searchable-select-collapsed-${instanceId}`, JSON.stringify([...newSet]));
      }
      
      return newSet;
    });
  };

  return (
    <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverContent
          className={`w-full max-w-[var(--radix-popover-trigger-width)] max-h-[300px] p-0 ${getZIndexClass('DROPDOWNS')} pointer-events-auto`}
          align="start"
          side="bottom"
          avoidCollisions={true}
          collisionPadding={8}
        >
        <Command className="max-h-[300px]">
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`} 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList 
            className="max-h-[200px] overflow-y-auto scrollbar-thin"
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            {Object.keys(groupedOptions).length === 0 && searchQuery.trim() ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              Object.entries(groupedOptions)
              .sort(([a], [b]) => {
                // Always put "None" group at the bottom
                if (a === 'None') return 1;
                if (b === 'None') return -1;
                return 0; // Maintain original order for other groups
              })
              .map(([groupName, groupOptions]) => {
              const isCollapsed = collapsedGroups.has(groupName);
              
              return (
                <div key={groupName}>
                  {/* Collapsible Group Header */}
                  <div 
                    className="flex items-center px-2 py-1.5 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/50 rounded-sm"
                    onClick={() => toggleGroup(groupName)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    )}
                    {groupName}
                    <span className="ml-auto text-xs opacity-60">
                      ({groupOptions.length})
                    </span>
                  </div>
                  
                  {/* Group Options */}
                  {!isCollapsed && (
                    <CommandGroup>
                      {groupOptions.map((option, index) => (
                        <CommandItem
                          key={`${groupName}-${option.value}-${index}`}
                          value={option.label}
                          onSelect={() => {
                            onValueChange(option.value === value ? '' : option.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "cursor-pointer hover:bg-accent hover:text-accent-foreground",
                            value === option.value 
                              ? "bg-primary/10 text-primary border-l-2 border-primary" 
                              : "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                          )}
                        >
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>
              );
            })
            )}
          </CommandList>
        </Command>
        </PopoverContent>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
