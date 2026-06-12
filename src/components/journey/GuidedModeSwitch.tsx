/**
 * VTID-03279 — Guided Journey / Full App segmented switch (P4).
 *
 * Reuses the existing ProfileIdSegmentedControl primitive (no new design).
 * Sits directly above the My Journey card so first-time users see the
 * Guided/Full choice prominently. Switching never clears progress —
 * it only flips the durable mode (P1) and restores the same session on return.
 */

import { ProfileIdSegmentedControl } from '@/components/profile/shared/ProfileIdSegmentedControl';
import { useGuidedMode, type JourneyMode } from '@/context/GuidedModeProvider';
import { t } from '@/lib/i18n-toast';

export function GuidedModeSwitch({ className }: { className?: string }) {
  const { mode, setMode, loading } = useGuidedMode();
  if (loading) return null;

  const segments = [
    { id: 'guided' as JourneyMode, label: t('screens.guidedMode.guidedLabel') },
    { id: 'full' as JourneyMode, label: t('screens.guidedMode.fullLabel') },
  ];

  return (
    <ProfileIdSegmentedControl
      segments={segments}
      value={mode}
      onChange={(next) => {
        if (next !== mode) setMode(next);
      }}
      size="sm"
      className={className}
    />
  );
}
