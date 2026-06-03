/**
 * E6 — Find a Match filter sheet.
 *
 * Bottom sheet opened from the filter icon on the Find a Match header.
 * Edits a *draft* copy of the filters and only commits on Apply, so the
 * underlying list doesn't churn while the user is still choosing. The live
 * result count in the footer previews how many matches the draft would show.
 *
 * Controls map to the product brief:
 *   - Age range          (dual slider) — see findMatchFilters honesty note
 *   - Distance           (slider, "Any" at the top)
 *   - Interests          (toggle chips)
 *   - Goals              (toggle chips)
 *   - Show only online    (switch)
 *   - Hide already viewed (switch)
 */

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import type { FindPartnerMatch } from '@/lib/intentApi';
import {
  AGE_BOUNDS,
  DISTANCE_ANY,
  DISTANCE_BOUNDS,
  DEFAULT_FILTERS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  applyFindMatchFilters,
  countActiveFilters,
  type ChipOption,
  type FindMatchFilters,
} from '@/lib/findMatchFilters';

interface FindMatchFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FindMatchFilters;
  onApply: (next: FindMatchFilters) => void;
  /** The unfiltered matches — used to preview the result count live. */
  matches: FindPartnerMatch[];
  viewedIds: Set<string>;
}

function ChipRow({
  options,
  selected,
  onToggle,
}: {
  options: ChipOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              on
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground/80 border-border hover:bg-muted',
            )}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

function PendingDataHint({ text }: { text: string }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

export function FindMatchFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  matches,
  viewedIds,
}: FindMatchFilterSheetProps) {
  // Draft state — edited locally, committed on Apply.
  const [draft, setDraft] = useState<FindMatchFilters>(filters);

  // Re-seed the draft each time the sheet opens so it reflects the
  // currently-applied filters (and discards any abandoned edits).
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggle = (key: 'interests' | 'goals') => (id: string) =>
    setDraft((d) => {
      const set = new Set(d[key]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...d, [key]: Array.from(set) };
    });

  const previewCount = applyFindMatchFilters(matches, draft, viewedIds).length;
  const activeCount = countActiveFilters(draft);

  const distanceLabel =
    draft.maxDistanceKm >= DISTANCE_ANY
      ? t('screens.community.filterDistanceAny')
      : t('screens.community.filterDistanceValue', { km: draft.maxDistanceKm });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('screens.community.filterMatches')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 pb-28">
          {/* Age range */}
          <div>
            <div className="flex items-center justify-between">
              <Label>{t('screens.community.filterAge')}</Label>
              <span className="text-sm text-muted-foreground">
                {t('screens.community.filterAgeValue', { min: draft.ageMin, max: draft.ageMax })}
              </span>
            </div>
            <Slider
              className="mt-3"
              min={AGE_BOUNDS.min}
              max={AGE_BOUNDS.max}
              step={1}
              value={[draft.ageMin, draft.ageMax]}
              onValueChange={([min, max]) => setDraft((d) => ({ ...d, ageMin: min, ageMax: max }))}
            />
            <PendingDataHint text={t('screens.community.filterAgePending')} />
          </div>

          <Separator />

          {/* Distance */}
          <div>
            <div className="flex items-center justify-between">
              <Label>{t('screens.community.filterDistance')}</Label>
              <span className="text-sm text-muted-foreground">{distanceLabel}</span>
            </div>
            <Slider
              className="mt-3"
              min={DISTANCE_BOUNDS.min}
              max={DISTANCE_BOUNDS.max}
              step={5}
              value={[draft.maxDistanceKm]}
              onValueChange={([km]) => setDraft((d) => ({ ...d, maxDistanceKm: km }))}
            />
            <PendingDataHint text={t('screens.community.filterDistancePending')} />
          </div>

          <Separator />

          {/* Interests */}
          <div>
            <Label className="mb-2 block">{t('screens.community.filterInterests')}</Label>
            <ChipRow
              options={INTEREST_OPTIONS}
              selected={draft.interests}
              onToggle={toggle('interests')}
            />
          </div>

          <Separator />

          {/* Goals */}
          <div>
            <Label className="mb-2 block">{t('screens.community.filterGoals')}</Label>
            <ChipRow options={GOAL_OPTIONS} selected={draft.goals} onToggle={toggle('goals')} />
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="filter-online" className="font-normal">
                {t('screens.community.filterOnlineOnly')}
              </Label>
              <Switch
                id="filter-online"
                checked={draft.onlineOnly}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, onlineOnly: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="filter-viewed" className="font-normal">
                {t('screens.community.filterHideViewed')}
              </Label>
              <Switch
                id="filter-viewed"
                checked={draft.hideViewed}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, hideViewed: v }))}
              />
            </div>
          </div>
        </div>

        {/* Sticky footer — clear + apply with live count. */}
        <div className="absolute inset-x-0 bottom-0 bg-background border-t border-border p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            className="shrink-0"
            disabled={activeCount === 0}
            onClick={() => setDraft(DEFAULT_FILTERS)}
          >
            {t('screens.community.filterClearAll')}
          </Button>
          <Button className="flex-1" onClick={() => { onApply(draft); onOpenChange(false); }}>
            {t('screens.community.filterShowResults', { count: previewCount })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
