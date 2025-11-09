'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ArchiveMonthTabs from "@/components/archive/archive-month-tabs";
import MonthBoxTabs from "@/components/archive/month-box-tabs";
import type { AvailableArchiveMonth } from "@/types/archive";

export default function ArchivePage() {
  const { getPreference, setPreference } = useUserPreferences();
  const [months, setMonths] = useState<AvailableArchiveMonth[]>([]);
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const [isLoadingMonths, setIsLoadingMonths] = useState(true);
  const [visibleMonths, setVisibleMonths] = useState(6);

  useEffect(() => {
    const loadMonths = async () => {
      setIsLoadingMonths(true);
      try {
        const response = await fetch("/api/archive/months");
        if (!response.ok) throw new Error("Failed to load archive months");
        const data: AvailableArchiveMonth[] = await response.json();
        setMonths(data);
        setVisibleMonths((prev) => Math.min(Math.max(prev, 6), data.length));
        if (data.length > 0) {
          const saved = getPreference("archive-active-month", data[0].key);
          const match = data.find((m) => m.key === saved) ?? data[0];
          setActiveMonthKey(match.key);
        } else {
          setActiveMonthKey(null);
        }
      } catch (error) {
        console.error("[ArchivePage] Failed to load months:", error);
        setMonths([]);
        setActiveMonthKey(null);
      } finally {
        setIsLoadingMonths(false);
      }
    };
    loadMonths();
  }, [getPreference]);

  const activeMonth = useMemo(
    () => months.find((m) => m.key === activeMonthKey) ?? null,
    [months, activeMonthKey]
  );

  const handleSelectMonth = (key: string) => {
    setActiveMonthKey(key);
    setPreference("archive-active-month", key);
  };

  const handleMoveMonth = (direction: "prev" | "next") => {
    if (!activeMonthKey || months.length === 0) return;
    const index = months.findIndex((m) => m.key === activeMonthKey);
    if (index === -1) return;
    const targetIndex = direction === "prev" ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= months.length) return;
    const target = months[targetIndex];
    handleSelectMonth(target.key);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archive Vault</h1>
          <p className="text-muted-foreground text-sm">
            Breadcrumb pattern: / {activeMonth?.label ?? "…"} / Tasks. Archive Vault is the root for every box.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={
              !activeMonthKey ||
              months.findIndex((m) => m.key === activeMonthKey) === months.length - 1
            }
            onClick={() => handleMoveMonth("prev")}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={
              !activeMonthKey ||
              months.findIndex((m) => m.key === activeMonthKey) === 0
            }
            onClick={() => handleMoveMonth("next")}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <section>
        {isLoadingMonths ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <ArchiveMonthTabs
            months={months.slice(0, visibleMonths)}
            activeMonthKey={activeMonthKey}
            onSelectMonth={handleSelectMonth}
          />
        )}
        {!isLoadingMonths && visibleMonths < months.length && (
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" onClick={() => setVisibleMonths((prev) => prev + 6)}>
              Load older history
            </Button>
          </div>
        )}
      </section>

      <section className="flex-1">
        {activeMonth ? (
          <MonthBoxTabs month={activeMonth} />
        ) : (
          <div className="border border-dashed rounded-xl p-12 text-center text-muted-foreground">
            {months.length === 0 ? (
              <div>
                <p className="text-lg font-medium">No archive boxes yet.</p>
                <p className="text-sm">
                  Close your first month to see archived entities here.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">Select a month box.</p>
                <p className="text-sm">
                  Choose a month from the grid above to review its archived data.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
