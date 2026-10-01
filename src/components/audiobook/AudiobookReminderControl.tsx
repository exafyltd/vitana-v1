/**
 * VTID-04763 — "Remind me daily" for the Audiobook.
 *
 * One select: off, or a time of day. The gateway sends "your episode for
 * today" at that local time — only on days the member hasn't listened yet,
 * at most once a day, and within their quiet hours / notification settings.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { communityFetch } from '@/lib/community-gateway';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { JOURNEY_STATE_QUERY_KEY, fetchJourneyState } from '@/hooks/useGuidedJourneyProgress';
import { cn } from '@/lib/utils';

/** Offered times — all before 22:00 (the server's catch-up window can't wrap midnight). */
export const AUDIOBOOK_REMINDER_TIMES = ['07:00', '08:00', '12:00', '18:00', '20:00', '21:00'] as const;

function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function saveAudiobookReminder(time: string | null): Promise<boolean> {
  try {
    const resp = await communityFetch('/api/v1/journey/audiobook/reminder', {
      method: 'POST',
      body: JSON.stringify(time ? { time, tz: localTimeZone() } : { time: null }),
    });
    const json = await resp.json();
    return !!(resp.ok && json?.ok);
  } catch {
    return false;
  }
}

export function AudiobookReminderControl({ className }: { className?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: state } = useQuery({
    queryKey: JOURNEY_STATE_QUERY_KEY,
    queryFn: () => fetchJourneyState(user?.id ?? null),
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  const [saving, setSaving] = useState(false);
  const current = state?.audiobookReminder?.time ?? 'off';

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
    <label
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-purple-100 bg-white/80 px-4 py-3 shadow-sm',
        className,
      )}
      data-testid="audiobook-reminder-control"
    >
      <Bell className="h-5 w-5 shrink-0 text-purple-600" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{t('screens.audiobook.reminderTitle')}</span>
        <span className="block text-xs text-gray-600">{t('screens.audiobook.reminderBody')}</span>
      </span>
      <select
        value={current}
        disabled={saving || !user}
        onChange={(e) => void onChange(e.target.value)}
        className="h-11 shrink-0 rounded-xl border border-purple-200 bg-white px-3 text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        aria-label={t('screens.audiobook.reminderTitle')}
        data-testid="audiobook-reminder-select"
      >
        <option value="off">{t('screens.audiobook.reminderOffOption')}</option>
        {AUDIOBOOK_REMINDER_TIMES.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}
