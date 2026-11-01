/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings?mode=notifications`,
 * the `case 'notifications'` branch of `src/pages/MobileSettings.tsx`: the push
 * switch, the per-category switches grouped chat / calendar / community
 * (locked categories always on), the role notifications list, quiet hours,
 * then the Vitana messages card (`VitanaMessagesSettings.tsx`).
 *
 * Not reproduced: the web `PushDiagnostics` card — it inspects the browser
 * service worker, Web Push permission and the Appilix WebView FCM token, none
 * of which exist in the native app (native push is the N4 registration, its
 * own lane).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, notify, notifyError, useUITheme } from '../../../ports/ui';
import { SettingsIcon } from '../../../ports/settings-ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { Divider, GroupCaption, SectionCard, ToggleRow } from '../components';
import {
  useCompanionPreferences,
  useNotificationCategoryPreferences,
  useNotificationPreferences,
  type CategoryPreference,
} from '../data/hooks';
import type { CompanionPreferences, NotificationPreferences } from '../data/requests';

const CATEGORY_TYPES = ['chat', 'calendar', 'community'] as const;

export function NotificationsSection(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences();
  const { categories, role, roleNotifications, loading: catLoading, toggleCategory } = useNotificationCategoryPreferences(locale);

  const handleToggle = async (field: keyof NotificationPreferences, value: boolean) => {
    try {
      await updatePref(field, value);
    } catch {
      notifyError('settingsNative.notifications.updateFailed');
    }
  };
  const handleCategoryToggle = async (cat: CategoryPreference) => {
    try {
      await toggleCategory(cat.id, !cat.enabled);
    } catch {
      notifyError('settingsNative.notifications.updateFailed');
    }
  };
  const typeLabel: Record<(typeof CATEGORY_TYPES)[number], string> = {
    chat: t('settingsNative.notifications.chat'),
    calendar: t('settingsNative.notifications.calendar'),
    community: t('settingsNative.notifications.community'),
  };

  return (
    <>
      <SectionCard icon="Bell" title={t('screens.mobilesettings.notifications')} testID="settings-notifications">
        <ToggleRow
          title={t('screens.mobilesettings.pushNotifications')}
          icon={<SettingsIcon name={prefs.push_enabled ? 'Bell' : 'BellOff'} size={16} color={prefs.push_enabled ? colors.primary : colors.mutedForeground} />}
          checked={prefs.push_enabled}
          onChange={(v) => void handleToggle('push_enabled', v)}
          disabled={prefsLoading}
          testID="settings-push-switch"
        />

        {CATEGORY_TYPES.map((type) => {
          const items = categories?.[type] || [];
          if (items.length === 0) return null;
          return (
            <View key={type} testID={`settings-category-group-${type}`}>
              <Divider />
              <GroupCaption>{typeLabel[type]}</GroupCaption>
              {items.map((cat) => (
                <ToggleRow
                  key={cat.id}
                  title={cat.display_name}
                  description={cat.description}
                  hint={cat.locked ? t('notificationControls.member.alwaysOn') : undefined}
                  titleWeight="400"
                  truncate
                  checked={cat.locked ? true : cat.enabled}
                  onChange={() => void handleCategoryToggle(cat)}
                  disabled={catLoading || !!cat.locked}
                  testID={`settings-category-${cat.id}`}
                />
              ))}
            </View>
          );
        })}

        {role && roleNotifications.length > 0 ? (
          <View testID="role-notifications">
            <Divider />
            <GroupCaption>{t(`notificationControls.member.roleTitle.${role}`)}</GroupCaption>
            <Text size="xs" muted style={styles.roleHint}>
              {t('notificationControls.member.roleHint')}
            </Text>
            {roleNotifications.map((n) => (
              <Text key={n.type} size="sm" style={styles.roleItem}>
                {locale === 'de' ? n.label.de : n.label.en}
              </Text>
            ))}
          </View>
        ) : null}

        <Divider />
        <ToggleRow
          title={t('screens.mobilesettings.quietHours')}
          icon={<SettingsIcon name="Moon" size={16} color={colors.mutedForeground} />}
          titleWeight="400"
          checked={prefs.dnd_enabled}
          onChange={(v) => void handleToggle('dnd_enabled', v)}
          disabled={prefsLoading}
          testID="settings-quiet-hours-switch"
        />
      </SectionCard>
      <VitanaMessagesCard />
    </>
  );
}

const TOPICS: { key: Exclude<keyof CompanionPreferences, 'enabled'>; label: string; desc: string }[] = [
  { key: 'topic_health', label: 'screens.settings.vitanaMessages.health', desc: 'screens.settings.vitanaMessages.healthDesc' },
  { key: 'topic_community', label: 'screens.settings.vitanaMessages.community', desc: 'screens.settings.vitanaMessages.communityDesc' },
  { key: 'topic_business', label: 'screens.settings.vitanaMessages.business', desc: 'screens.settings.vitanaMessages.businessDesc' },
];

/** `src/components/settings/VitanaMessagesSettings.tsx` (VTID-05100). */
export function VitanaMessagesCard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { preferences, isLoading, isError, isSaving, update } = useCompanionPreferences();
  const ready = !!preferences && !isError;
  const handleToggle = async (key: keyof CompanionPreferences, value: boolean) => {
    try {
      await update({ [key]: value });
      notify('toasts.settings.settingsUpdated2');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateSettings');
    }
  };
  return (
    <SectionCard icon="Sparkles" title={t('screens.settings.vitanaMessages.title')} testID="vitana-messages-settings">
      <Text size="sm" muted>
        {t('screens.settings.vitanaMessages.desc')}
      </Text>
      {isError ? (
        <Text size="sm" accessibilityRole="alert" color={colors.destructive} testID="vitana-messages-error">
          {t('screens.settings.vitanaMessages.loadError')}
        </Text>
      ) : null}
      <ToggleRow
        title={t('screens.settings.vitanaMessages.enabled')}
        description={t('screens.settings.vitanaMessages.enabledDesc')}
        checked={!!preferences?.enabled}
        disabled={!ready || isLoading || isSaving}
        onChange={(v) => void handleToggle('enabled', v)}
        testID="vitana-messages-enabled"
      />
      <View style={[styles.topics, !preferences?.enabled ? styles.dimmed : null]}>
        <Divider />
        <GroupCaption>{t('screens.settings.vitanaMessages.topics')}</GroupCaption>
        {TOPICS.map((topic) => (
          <ToggleRow
            key={topic.key}
            title={t(topic.label)}
            description={t(topic.desc)}
            checked={!!preferences?.[topic.key]}
            disabled={!ready || isLoading || isSaving || !preferences?.enabled}
            onChange={(v) => void handleToggle(topic.key, v)}
            testID={`vitana-messages-${topic.key}`}
          />
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  roleHint: { paddingBottom: 4 },
  roleItem: { paddingVertical: 6 },
  topics: { gap: 8 },
  dimmed: { opacity: 0.6 },
});
