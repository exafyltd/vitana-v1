/**
 * VTID-05530 — the interrupt card a reminder's push link opens (`/reminders/fire/:fireId`): native
 * twin of the web's `ReminderInterruptOverlay` deep-link path. The reminder is fetched by id and the
 * card shows its text, spoken message and notes with Mark done / Snooze 10 min / Dismiss. There is no
 * chime or voice: that audio is only pre-rendered for the live stream, and the push already notified
 * the member (the web makes the same trade-off for the deep link).
 *
 * Mark done completes the reminder on the server; an Autopilot slot answers with the screen it
 * belongs to, opened here when it is an in-app path (never another origin).
 */
import { useState, type ReactElement } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ackReminder, autopilotSlotRoute, completeReminderWithSlot, snoozeReminder, type ReminderRow } from './data/reminders';

export function ReminderFireOverlay({ reminder, onClose }: { reminder: ReminderRow; onClose: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch {
      /* the web closes the card either way; the list refetches */
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const onComplete = async () => {
    let route: string | null = null;
    await run(async () => {
      // A reminder that belongs to an Autopilot slot completes the suggestion on the server and opens its screen.
      const { autopilotSlot } = await completeReminderWithSlot(reminder.id);
      route = autopilotSlotRoute(autopilotSlot);
    });
    if (route) navigateToWebPath(route);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} testID="reminder-fire-overlay">
      <View style={styles.scrim}>
        <View accessibilityViewIsModal accessibilityLabel={t('screens.reminders.reminder')} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <View style={styles.head}>
            <View style={[styles.bell, { backgroundColor: colors.muted }]} importantForAccessibility="no-hide-descendants">
              <Text size="lg">🔔</Text>
            </View>
            <Text variant="title" accessibilityRole="header" style={styles.flex}>
              {reminder.action_text}
            </Text>
          </View>
          {reminder.spoken_message && reminder.spoken_message !== reminder.action_text ? (
            <Text muted>{reminder.spoken_message}</Text>
          ) : null}
          {reminder.description ? <Text muted>{reminder.description}</Text> : null}
          <View style={styles.actions}>
            <Button onPress={() => void onComplete()} disabled={busy} testID="reminder-fire-done">
              {`✓ ${t('screens.reminders.markDone')}`}
            </Button>
            <Button variant="outline" onPress={() => void run(() => snoozeReminder(reminder.id, 10))} disabled={busy} testID="reminder-fire-snooze">
              {t('screens.reminders.snooze10Min')}
            </Button>
            <Button variant="ghost" onPress={() => void run(() => ackReminder(reminder.id, 'manual'))} disabled={busy} testID="reminder-fire-dismiss">
              {t('screens.reminders.dismiss')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, borderRadius: 20, borderWidth: 2, padding: 24, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bell: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { gap: 8, marginTop: 8 },
});
