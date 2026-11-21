/**
 * VTID-05450 — native twin of src/components/onboarding/OnboardingNameForm.tsx:
 * "Let's get to know you" — display name (pre-filled from the sign-up
 * `full_name` / `name`), the Vitanaland handle (suggested from the name until
 * the member types one; a-z 0-9 _ only, 3–30, availability checked 400 ms
 * after the last keystroke), "Introduce me to the community" (on by default;
 * only an explicit "no" is written, VTID-05206) and "Let's get started!".
 * The writes are the member's own rows (onboarding-data.ts); no auth write.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableRow, Spinner, Text, TextInput, useUITheme } from '../../ports/ui';
import { OnboardingIcon, Switch, useOnboardingPalette, withAlpha } from '../../ports/onboarding';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import {
  DISPLAY_NAME_MAX,
  HANDLE_CHECK_DEBOUNCE_MS,
  HANDLE_MAX,
  HANDLE_MIN,
  canSubmitForm,
  checkHandleAvailability,
  cleanHandle,
  localHandleStatus,
  saveOnboardingProfile,
  slugify,
  type HandleStatus,
} from './onboarding-data';
import { VitanaAvatar } from './OnboardingSpeech';

function metaName(meta: Record<string, unknown> | undefined): string {
  const v = meta?.full_name ?? meta?.name;
  return typeof v === 'string' ? v : '';
}

export function OnboardingNameForm({ onComplete }: { onComplete: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useOnboardingPalette();
  const { user } = useAuth();
  const initialName = metaName(user?.user_metadata);
  const [displayName, setDisplayName] = useState(initialName);
  const [handle, setHandle] = useState(initialName ? slugify(initialName) : '');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [introduceMe, setIntroduceMe] = useState(true);
  // Suggest a handle from the name only while the member has not typed one (and not when pre-filled).
  const autoSuggest = useRef(!initialName);
  const userId = user?.id;

  useEffect(() => {
    if (autoSuggest.current && displayName) setHandle(slugify(displayName));
  }, [displayName]);

  useEffect(() => {
    const local = localHandleStatus(handle);
    if (local) {
      setHandleStatus(local);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setHandleStatus('checking');
      void checkHandleAvailability(handle, userId).then((s) => {
        if (!cancelled) setHandleStatus(s);
      });
    }, HANDLE_CHECK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, userId]);

  const onHandleChange = (value: string) => {
    autoSuggest.current = false;
    setHandle(cleanHandle(value));
  };

  const canSubmit = canSubmitForm(displayName, handle, handleStatus, saving);

  const submit = async () => {
    if (!canSubmit || !userId) return;
    setError('');
    setSaving(true);
    const r = await saveOnboardingProfile({ userId, displayName, handle, introduceMe });
    setSaving(false);
    if (r.ok) {
      onComplete();
      return;
    }
    if (r.handleTaken) {
      setHandleStatus('taken');
      setError(t('onboardingNative.errors.handleTaken'));
      return;
    }
    // The web shows the server's message when there is one, else its generic line.
    setError(r.message || t('onboardingNative.errors.generic'));
  };

  const nameLabel = t('onboarding.nameForm.displayNameLabel');
  const handleLabel = t('onboarding.nameForm.handleLabel');
  const introLabel = t('onboarding.nameForm.communityIntroLabel');
  const submitLabel = saving ? t('onboarding.nameForm.saving') : t('onboarding.nameForm.submit');

  return (
    <View style={styles.outer} testID="onboarding-name-form">
      <View style={[styles.card, { backgroundColor: withAlpha(colors.card, 0.95) }]}>
        <View style={styles.header}>
          <VitanaAvatar size={48} />
          <Text variant="title" accessibilityRole="header" style={styles.center}>
            {t('onboarding.nameForm.title')}
          </Text>
          <Text muted style={styles.center}>
            {t('onboarding.nameForm.subtitle')}
          </Text>
        </View>

        <View style={styles.field}>
          <Text variant="label" muted nativeID="onb-display-name-label">
            {nameLabel}
          </Text>
          <TextInput
            testID="onb-display-name"
            accessibilityLabel={nameLabel}
            accessibilityLabelledBy="onb-display-name-label"
            placeholder={t('onboarding.nameForm.displayNamePlaceholder')}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={DISPLAY_NAME_MAX}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text variant="label" muted nativeID="onb-handle-label">
            {handleLabel}
          </Text>
          <View style={styles.handleRow}>
            <Text muted style={styles.at} accessibilityElementsHidden importantForAccessibility="no">
              @
            </Text>
            <View style={styles.flex}>
              <TextInput
                testID="onb-handle"
                accessibilityLabel={handleLabel}
                accessibilityLabelledBy="onb-handle-label"
                placeholder={t('onboarding.nameForm.handlePlaceholder')}
                value={handle}
                onChangeText={onHandleChange}
                maxLength={HANDLE_MAX}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.statusIcon} testID={`onb-handle-status-${handleStatus}`}>
              {handleStatus === 'checking' ? <Spinner /> : null}
              {handleStatus === 'available' ? <OnboardingIcon name="CheckCircle2" size={16} color={palette.success} /> : null}
              {handleStatus === 'taken' || handleStatus === 'invalid' ? <OnboardingIcon name="XCircle" size={16} color={palette.error} /> : null}
            </View>
          </View>
          <View accessibilityLiveRegion="polite">
            {handleStatus === 'taken' ? (
              <Text variant="caption" style={{ color: palette.error }}>
                {t('onboarding.nameForm.handleTaken')}
              </Text>
            ) : null}
            {handleStatus === 'invalid' ? (
              <Text variant="caption" style={{ color: palette.error }}>
                {t('onboarding.nameForm.handleInvalid')}
              </Text>
            ) : null}
            {handleStatus === 'available' ? (
              <Text variant="caption" style={{ color: palette.success }}>
                {t('onboarding.nameForm.handleAvailable')}
              </Text>
            ) : null}
            {handle.length > 0 && handle.length < HANDLE_MIN ? (
              <Text variant="caption" muted>
                {t('onboarding.nameForm.handleMinLength')}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.intro, { borderColor: colors.border }]} testID="onb-community-intro">
          <View style={styles.flex}>
            <Text variant="label" nativeID="onb-community-intro-label">
              {introLabel}
            </Text>
            <Text variant="caption" muted>
              {t('onboarding.nameForm.communityIntroHint')}
            </Text>
          </View>
          <Switch testID="onb-community-intro-switch" accessibilityLabel={introLabel} checked={introduceMe} onCheckedChange={setIntroduceMe} />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={[styles.center, { color: palette.error }]} testID="onb-error">
            {error}
          </Text>
        ) : null}

        <PressableRow
          testID="onb-submit"
          onPress={() => void submit()}
          disabled={!canSubmit}
          accessibilityLabel={submitLabel}
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.submit, { backgroundColor: palette.category4, opacity: canSubmit || saving ? 1 : 0.5 }]}
        >
          {saving ? <Spinner /> : null}
          <Text style={{ color: colors.primaryForeground, fontWeight: '500' }}>{submitLabel}</Text>
        </PressableRow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 16 },
  card: { borderRadius: 24, padding: 24, gap: 24 },
  header: { alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  field: { gap: 8 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  at: { fontSize: 14 },
  flex: { flex: 1 },
  statusIcon: { width: 20, alignItems: 'center' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  submit: { minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
});
