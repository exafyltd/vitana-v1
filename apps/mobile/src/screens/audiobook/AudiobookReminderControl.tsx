/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — twin
 * of `src/components/audiobook/AudiobookReminderControl.tsx` (VTID-04763),
 * "Remind me daily" for the Audiobook, drawn in My Journey's Guided view
 * between "how it works" and the catalog (AutopilotDashboard.tsx:435; the
 * journey lane's `JourneySlotsContext` slot, filled by the player provider).
 *
 * One select: off, or a time of day (the web's six times, all before 22:00).
 * Saving posts `POST /api/v1/journey/audiobook/reminder` `{ time, tz }` (or
 * `{ time: null }`) with the device time zone, toasts the result and refetches
 * the journey state; a failure toasts `reminderError`. The web `<select>` is
 * the kit's Select (a bottom-sheet list on native).
 *
 * The current value is the journey state's `audiobookReminder.time`. The
 * journey lane's `fetchJourneyState` does not carry that field yet
 * (useGuidedJourneyProgress.ts:131-155 drops it), so this control reads the
 * same `GET /journey/state` under a child key of the journey-state query key:
 * every journey-state invalidation (the web's `invalidateQueries(JOURNEY_STATE_QUERY_KEY)`)
 * refreshes it too. Follow-up in verification.md.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { AudiobookIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toneAlpha, useAudiobookTone } from '../../ports/audiobook';
import { JOURNEY_STATE_QUERY_KEY, communityFetch } from '../../ports/journey-dashboard';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';

/** Offered times — all before 22:00 (the server's catch-up window can't wrap midnight). */
export const AUDIOBOOK_REMINDER_TIMES = ['07:00', '08:00', '12:00', '18:00', '20:00', '21:00'] as const;

export const AUDIOBOOK_REMINDER_QUERY_KEY = [...JOURNEY_STATE_QUERY_KEY, 'audiobookReminder'] as const;

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function saveAudiobookReminder(time: string | null): Promise<boolean> {
  try {
    const resp = await communityFetch('/journey/audiobook/reminder', {
      method: 'POST',
      body: JSON.stringify(time ? { time, tz: localTimeZone() } : { time: null }),
    });
    const json = await resp.json<{ ok?: boolean }>();
    return !!(resp.ok && json?.ok);
  } catch {
    return false;
  }
}

/** web parseReminder (useGuidedJourneyProgress.ts): `{ time, tz }` or null. */
export async function fetchAudiobookReminder(): Promise<{ time: string; tz: string } | null> {
  const resp = await communityFetch('/journey/state');
  const json = await resp.json<{ ok?: boolean; state?: { audiobookReminder?: unknown } }>().catch(() => ({}) as { ok?: boolean; state?: { audiobookReminder?: unknown } });
  const r = resp.ok && json?.ok ? (json.state?.audiobookReminder as { time?: unknown; tz?: unknown } | null | undefined) : null;
  return r && typeof r.time === 'string' ? { time: r.time, tz: typeof r.tz === 'string' ? r.tz : 'UTC' } : null;
}

export function AudiobookReminderControl(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useAudiobookTone('category-2');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: reminder } = useQuery({
    queryKey: AUDIOBOOK_REMINDER_QUERY_KEY,
    queryFn: fetchAudiobookReminder,
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  const [saving, setSaving] = useState(false);
  const current = reminder?.time ?? 'off';

  const onChange = async (value: string) => {
    setSaving(true);
    const ok = await saveAudiobookReminder(value === 'off' ? null : value);
    setSaving(false);
    if (!ok) {
      notifyError('screens.audiobook.reminderError');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
    if (value === 'off') notify('screens.audiobook.reminderOff');
    else notify('screens.audiobook.reminderSaved', undefined, { time: value });
  };

  return (
    <View testID="audiobook-reminder-control" style={[styles.row, { borderColor: toneAlpha(tone, 0.15), backgroundColor: colors.card }]}>
      <AudiobookIcon name="Bell" size={20} color={tone} />
      <View style={styles.text}>
        <Text size="sm" weight="600">
          {t('screens.audiobook.reminderTitle')}
        </Text>
        <Text size="xs" muted>
          {t('screens.audiobook.reminderBody')}
        </Text>
      </View>
      <Select value={current} onValueChange={(v) => void onChange(v)} disabled={saving || !user}>
        <SelectTrigger testID="audiobook-reminder-select" accessibilityLabel={t('screens.audiobook.reminderTitle')} style={[styles.trigger, { borderColor: toneAlpha(tone, 0.25) }]}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent testID="audiobook-reminder-options">
          <SelectItem value="off" testID="audiobook-reminder-off">
            {t('screens.audiobook.reminderOffOption')}
          </SelectItem>
          {AUDIOBOOK_REMINDER_TIMES.map((time) => (
            <SelectItem key={time} value={time} testID={`audiobook-reminder-${time}`}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  text: { flex: 1, minWidth: 0 },
  trigger: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
});
