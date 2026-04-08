'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Globe, Clock, CheckCircle, ChevronDown, X } from 'lucide-react';
import {
  COMMON_TIMEZONES,
  getBrowserTimezone,
  getUserTimezone,
  setUserTimezone,
  clearUserTimezone,
  getUTCOffsetForTimezone,
  formatInUserTimezone,
} from '@/lib/utils/user-timezone';

/**
 * TimezoneSettingsCard
 *
 * Allows users to set their local timezone for date display.
 * Does NOT affect stored data (always UTC). Only affects UI display.
 *
 * Core principle: UTC in storage, localized in display.
 */
export function TimezoneSettingsCard() {
  const [selectedTz, setSelectedTz] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [browserTz, setBrowserTz] = useState('UTC');
  const [previewDate] = useState<Date>(new Date());

  // Load current timezone on mount (client-side only)
  useEffect(() => {
    const current = getUserTimezone();
    setSelectedTz(current);
    setBrowserTz(getBrowserTimezone());
  }, []);

  // Filtered timezone list based on search query
  const filteredTimezones = useMemo(() => {
    if (!searchQuery.trim()) return COMMON_TIMEZONES;
    const q = searchQuery.toLowerCase();
    return COMMON_TIMEZONES.filter(
      t =>
        t.label.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Group by region
  const grouped = useMemo(() => {
    const groups: Record<string, typeof COMMON_TIMEZONES> = {};
    for (const tz of filteredTimezones) {
      if (!groups[tz.region]) groups[tz.region] = [];
      groups[tz.region].push(tz);
    }
    return groups;
  }, [filteredTimezones]);

  const selectedOption = COMMON_TIMEZONES.find(t => t.value === selectedTz);
  const selectedLabel = selectedOption?.label || selectedTz;
  const currentOffset = selectedTz ? getUTCOffsetForTimezone(selectedTz) : '+00:00';

  const handleSelect = (tz: string) => {
    setSelectedTz(tz);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setSaved(false);
  };

  const handleSave = () => {
    if (selectedTz) {
      setUserTimezone(selectedTz);
      setSaved(true);
      // Trigger a storage event so other components can react
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'thegame:userTimezone',
        newValue: selectedTz,
      }));
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleResetToDefault = () => {
    clearUserTimezone();
    const detected = getBrowserTimezone();
    setSelectedTz(detected);
    setSaved(false);
    setUserTimezone(detected);
  };

  const isDetectedTz = selectedTz === browserTz;
  const previewFormatted = selectedTz ? formatInUserTimezone(previewDate, 'display', selectedTz) : '';
  const previewLong = selectedTz ? formatInUserTimezone(previewDate, 'long', selectedTz) : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Display Timezone
        </CardTitle>
        <CardDescription>
          Choose how dates are displayed. Stored data is always in UTC — this only affects what you see.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Current selection */}
        <div className="space-y-2">
          <Label htmlFor="timezone-selector" className="text-sm font-medium">
            Your Timezone
          </Label>

          {/* Custom searchable dropdown */}
          <div className="relative">
            <button
              id="timezone-selector"
              type="button"
              onClick={() => setIsDropdownOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent transition-colors text-left"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span className="flex items-center gap-2 truncate">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedLabel || 'Select timezone…'}</span>
                {selectedTz && (
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    UTC{currentOffset}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-hidden flex flex-col">
                {/* Search input */}
                <div className="p-2 border-b">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search timezone…"
                      className="w-full px-3 py-1.5 text-sm bg-background border rounded-sm outline-none focus:ring-1 focus:ring-ring pr-8"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1" role="listbox">
                  {Object.entries(grouped).map(([region, tzList]) => (
                    <div key={region}>
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {region}
                      </div>
                      {tzList.map(tz => {
                        const offset = getUTCOffsetForTimezone(tz.value, previewDate);
                        const isSelected = tz.value === selectedTz;
                        return (
                          <button
                            key={tz.value}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(tz.value)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                              isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                            }`}
                          >
                            <span className="truncate">{tz.label}</span>
                            <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                              UTC{offset}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {Object.keys(grouped).length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No timezones found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {selectedTz && (
          <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Preview</p>
            <div className="flex items-center justify-between">
              <p className="text-sm">Current time in your timezone:</p>
              <span className="text-sm font-mono font-medium">{previewLong}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Display format (DD-MM-YYYY):</p>
              <span className="text-sm font-mono text-muted-foreground">{previewFormatted}</span>
            </div>
          </div>
        )}

        {/* Auto-detected notice */}
        {isDetectedTz && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            Auto-detected from your browser ({browserTz})
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={!selectedTz}
            size="sm"
            className="gap-1.5"
            id="save-timezone-btn"
          >
            {saved ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              'Save Timezone'
            )}
          </Button>

          {!isDetectedTz && (
            <Button
              onClick={handleResetToDefault}
              variant="outline"
              size="sm"
              id="reset-timezone-btn"
            >
              Reset to Browser Default
            </Button>
          )}
        </div>

        {/* Info note */}
        <p className="text-xs text-muted-foreground border-t pt-3">
          <strong>Note:</strong> This preference is saved locally in your browser and only affects how dates are displayed.
          All data is stored in UTC and is not affected by this setting.
        </p>
      </CardContent>
    </Card>
  );
}
