/**
 * VTID-05296 (N-W2 community-hub) — native port of the Find a Match filter
 * sheet (`src/components/intents/FindMatchFilterSheet.tsx`). A bottom sheet
 * that edits a DRAFT copy of the filters and only commits on Apply, so the
 * matches list does not churn while the user chooses. The control the web sheet
 * leads with — a range Slider — is the N2 kit's corrected-range `Slider`
 * (one draggable thumb; the web single-thumb defect is not reproduced, per the
 * plan). Native scopes the filter to the honest, data-backed control: a minimum
 * match-score threshold; the web's age/distance sliders sit on pending data
 * (their own `PendingDataHint`) and have no native data source yet.
 * Ports-layer + `@vitana/ui` only; RTL-safe; translated strings.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Slider, BottomSheet } from '../../ports/ui';

export interface FindPartnerFilters {
  minScore: number;
}

export const DEFAULT_FIND_PARTNER_FILTERS: FindPartnerFilters = { minScore: 0 };

export function countActiveFindPartnerFilters(f: FindPartnerFilters): number {
  return f.minScore > 0 ? 1 : 0;
}

export function FindPartnerFilterSheet({
  open,
  onClose,
  filters,
  onApply,
  resultCount,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  filters: FindPartnerFilters;
  onApply: (next: FindPartnerFilters) => void;
  /** Live preview of how many matches the draft would show. */
  resultCount: (draft: FindPartnerFilters) => number;
  labels: {
    title: string;
    minScore: string;
    minScoreValue: (score: number) => string;
    clear: string;
    apply: (count: number) => string;
  };
}) {
  const [draft, setDraft] = useState<FindPartnerFilters>(filters);

  // Re-seed the draft each time the sheet opens (discards abandoned edits).
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const active = countActiveFindPartnerFilters(draft);
  const preview = resultCount(draft);

  return (
    <BottomSheet open={open} onClose={onClose} title={labels.title} testID="find-partner-filter">
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text variant="label" muted>
            {labels.minScore}
          </Text>
          <Text variant="caption" muted testID="find-partner-filter-score-value">
            {labels.minScoreValue(draft.minScore)}
          </Text>
        </View>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[draft.minScore]}
          onValueChange={([v]) => setDraft({ minScore: v })}
          accessibilityLabel={labels.minScore}
          testID="find-partner-filter-slider"
        />

        <View style={styles.footer}>
          <Button
            variant="ghost"
            size="sm"
            disabled={active === 0}
            onPress={() => setDraft(DEFAULT_FIND_PARTNER_FILTERS)}
            testID="find-partner-filter-clear"
          >
            {labels.clear}
          </Button>
          <Button
            size="sm"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            testID="find-partner-filter-apply"
          >
            {labels.apply(preview)}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 },
});
