/**
 * VTID-05431 (Native Wave 2, settings lane) — the three privacy sections of
 * `src/pages/MobileSettings.tsx`:
 *
 *  - `privacy.visibility` — the seven local visibility switches (no backing
 *    store on the web either: `Switch defaultChecked`, nothing saved), then
 *    "Introduce me to the community" (`CommunityIntroToggle.tsx`), the phone
 *    number card (`PhoneNumberCard.tsx` + `VerifyPhoneDialog.tsx`) and "people
 *    who have my number can find me" (`PhoneDiscoverabilityToggle.tsx`); each
 *    of the last three hides itself while loading or unavailable, as on web.
 *  - `privacy.data` — the three health data-sharing switches (off and disabled
 *    until a consent record exists, VTID-05173), the AI data-sharing consent
 *    switch + disclosure sheet (`AIDataConsentDialog.tsx`), and the data
 *    export card (button disabled, no export job yet).
 *  - `privacy.security` — the security card exactly as the web renders it
 *    (static rows and local switches; the web wires none of them).
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet, Button, Text, TextInput, notify, notifyError, useUITheme } from '../../../ports/ui';
import { SettingsIcon } from '../../../ports/settings-ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { useAuth } from '../../../auth/AuthProvider';
import { Divider, SectionCard, SettingRow, ToggleRow } from '../components';
import {
  PhoneVerifyRequestError,
  confirmPhoneCode,
  fetchProfilePhone,
  phoneStatusQueryKey,
  removeVerifiedPhone,
  sendPhoneCode,
  useAIConsent,
  useCommunityIntro,
  usePhoneDiscoverability,
  usePhoneStatus,
} from '../data/hooks';
import { phoneRegionHint, type PhoneVerifyErrorCode } from '../data/requests';

const VISIBILITY_ITEMS = [
  { title: 'screens.settings.publicProfile', desc: 'screens.settings.allowOthersFindViewYourProfile', defaultChecked: true },
  { title: 'screens.settings.activityStatus', desc: 'screens.settings.showWhenYouReActivePlatform', defaultChecked: true },
  { title: 'screens.settings.vitanaIndexScore', desc: 'screens.settings.shareYourWellnessScoreWithCommunity', defaultChecked: false },
  { title: 'screens.settings.progressSharing', desc: 'screens.settings.shareWellnessProgressPublicly', defaultChecked: false },
  { title: 'screens.settings.achievementBadges', desc: 'screens.settings.displayEarnedAchievements', defaultChecked: true },
  { title: 'screens.settings.contactInformation', desc: 'screens.settings.allowMembersContactYou', defaultChecked: false },
  { title: 'screens.settings.locationData', desc: 'screens.settings.shareApproximateLocation', defaultChecked: false },
] as const;

export function PrivacyVisibilitySection(): ReactElement {
  const { t } = useI18n();
  return (
    <SectionCard icon="Eye" title={t('screens.mobilesettings.profileVisibility')} testID="settings-privacy-visibility">
      {VISIBILITY_ITEMS.map((item) => (
        <ToggleRow key={item.title} title={t(item.title)} description={t(item.desc)} defaultChecked={item.defaultChecked} testID={`settings-visibility-${item.title.split('.').pop()}`} />
      ))}
      <View style={styles.stackTop} testID="mobile-privacy-community-intro">
        <CommunityIntroToggle />
      </View>
      <View style={styles.stack} testID="mobile-privacy-phone">
        <PhoneNumberCard />
        <PhoneDiscoverabilityToggle />
      </View>
    </SectionCard>
  );
}

function CommunityIntroToggle(): ReactElement | null {
  const { t } = useI18n();
  const { userId, optedIn, isError, isLoading, set, isPending } = useCommunityIntro();
  if (!userId || isError || isLoading) return null;
  return (
    <View testID="community-intro">
      <ToggleRow
        title={t('screens.settings.communityIntroTitle')}
        description={t('screens.settings.communityIntroBody')}
        checked={optedIn === true}
        disabled={isPending}
        onChange={(v) => set(v)}
        testID="community-intro-switch"
      />
    </View>
  );
}

function PhoneDiscoverabilityToggle(): ReactElement | null {
  const { t } = useI18n();
  const { userId, discoverable, isError, isLoading, set, isPending } = usePhoneDiscoverability();
  if (!userId || isError || isLoading) return null;
  return (
    <View testID="phone-discoverability">
      <ToggleRow
        title={t('mailhub.findFriends.privacy.title')}
        description={t('mailhub.findFriends.privacy.body')}
        checked={!!discoverable}
        disabled={isPending}
        onChange={(v) => set(v)}
        testID="phone-discoverability-switch"
      />
    </View>
  );
}

function PhoneNumberCard(): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const status = usePhoneStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  if (!status) return null;

  const remove = async () => {
    setConfirmOpen(false);
    setRemoving(true);
    try {
      await removeVerifiedPhone();
      await qc.invalidateQueries({ queryKey: phoneStatusQueryKey(user?.id) });
      notify('mailhub.findFriends.verifyPhone.removed');
    } catch {
      notifyError('mailhub.findFriends.verifyPhone.errors.unknown');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <View style={styles.phoneCard} testID="phone-number-card">
      <View style={styles.phoneText}>
        <Text weight="500">{t('mailhub.findFriends.verifyPhone.title')}</Text>
        {status.verified && status.phone_masked ? (
          <View style={styles.verifiedRow} testID="phone-number-verified">
            <SettingsIcon name="CheckCircle2" size={16} color={colors.primary} />
            <Text size="sm" muted>
              {t('mailhub.findFriends.verifyPhone.verifiedLabel')}{' '}
            </Text>
            {/* the masked number is always left-to-right (web <bdi dir="ltr">) */}
            <Text size="sm" weight="500" style={styles.ltr}>
              {status.phone_masked}
            </Text>
          </View>
        ) : (
          <Text size="sm" muted>
            {t('mailhub.findFriends.verifyPhone.body')}
          </Text>
        )}
      </View>
      {status.verified ? (
        <View style={styles.actions}>
          <Button variant="outline" size="sm" onPress={() => setDialogOpen(true)} testID="phone-number-change">
            {t('mailhub.findFriends.verifyPhone.change')}
          </Button>
          <Button variant="ghost" size="sm" disabled={removing} onPress={() => setConfirmOpen(true)} testID="phone-number-remove">
            {t('mailhub.findFriends.verifyPhone.remove')}
          </Button>
        </View>
      ) : (
        <Button size="sm" onPress={() => setDialogOpen(true)} testID="phone-number-verify">
          {t('mailhub.findFriends.verifyPhone.verify')}
        </Button>
      )}
      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('mailhub.findFriends.verifyPhone.removeTitle')} testID="phone-remove-confirm">
        <Text size="sm" muted>
          {t('mailhub.findFriends.verifyPhone.removeBody')}
        </Text>
        <View style={styles.sheetActions}>
          <Button variant="outline" onPress={() => setConfirmOpen(false)} testID="phone-remove-cancel">
            {t('screens.contacts.cancel')}
          </Button>
          <Button variant="destructive" onPress={() => void remove()} testID="phone-remove-confirm-button">
            {t('mailhub.findFriends.verifyPhone.remove')}
          </Button>
        </View>
      </BottomSheet>
      <VerifyPhoneSheet open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </View>
  );
}

type Step = 'number' | 'code' | 'done';
const codeOf = (err: unknown): PhoneVerifyErrorCode => (err instanceof PhoneVerifyRequestError ? err.code : 'unknown');

/** `src/components/contacts/VerifyPhoneDialog.tsx`: number → 6-digit SMS code → done. */
function VerifyPhoneSheet({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('number');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PhoneVerifyErrorCode | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!open) return;
    setStep('number');
    setCode('');
    setError(null);
    setSentTo(null);
    if (prefilled.current || !user?.id) return;
    prefilled.current = true;
    void fetchProfilePhone(user.id).then((typed) => {
      if (typed) setPhone((current) => current || typed);
    });
  }, [open, user?.id]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const send = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const out = await sendPhoneCode(phone.trim(), phoneRegionHint(language));
      setSentTo(out.phone_masked);
      setResendIn(out.resend_after_seconds);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneCode(code);
      setStep('done');
      await qc.invalidateQueries({ queryKey: phoneStatusQueryKey(user?.id) });
      await qc.invalidateQueries({ queryKey: ['phone-discoverability', user?.id ?? null] });
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setBusy(false);
    }
  };

  const errorLine = error ? (
    <Text size="sm" color={colors.destructive} accessibilityRole="alert" testID="verify-phone-error">
      {t(`mailhub.findFriends.verifyPhone.errors.${error}`)}
    </Text>
  ) : null;

  return (
    <BottomSheet open={open} onClose={onClose} title={t('mailhub.findFriends.verifyPhone.dialogTitle')} testID="verify-phone-dialog">
      <Text size="sm" muted>
        {step === 'code'
          ? `${t('mailhub.findFriends.verifyPhone.codeHelp')} ${sentTo ?? ''}`.trim()
          : step === 'done'
            ? t('mailhub.findFriends.verifyPhone.done')
            : t('mailhub.findFriends.verifyPhone.numberHelp')}
      </Text>
      {step === 'number' ? (
        <View style={styles.form}>
          <Text size="sm" weight="500">
            {t('mailhub.findFriends.verifyPhone.numberLabel')}
          </Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" accessibilityLabel={t('mailhub.findFriends.verifyPhone.numberLabel')} testID="verify-phone-number" />
          {errorLine}
          <Button disabled={busy || !phone.trim()} onPress={() => void send()} testID="verify-phone-send">
            {t('mailhub.findFriends.verifyPhone.sendCode')}
          </Button>
        </View>
      ) : null}
      {step === 'code' ? (
        <View style={styles.form}>
          <Text size="sm" weight="500">
            {t('mailhub.findFriends.verifyPhone.codeLabel')}
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            accessibilityLabel={t('mailhub.findFriends.verifyPhone.codeLabel')}
            testID="verify-phone-code"
          />
          {errorLine}
          <Button disabled={busy || !/^\d{6}$/.test(code)} onPress={() => void confirm()} testID="verify-phone-confirm">
            {t('mailhub.findFriends.verifyPhone.confirm')}
          </Button>
          <View style={styles.actions}>
            <Button variant="ghost" size="sm" onPress={() => setStep('number')} testID="verify-phone-change-number">
              {t('mailhub.findFriends.verifyPhone.changeNumber')}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy || resendIn > 0} onPress={() => void send()} testID="verify-phone-resend">
              {resendIn > 0 ? t('mailhub.findFriends.verifyPhone.resendIn', { seconds: resendIn }) : t('mailhub.findFriends.verifyPhone.resend')}
            </Button>
          </View>
        </View>
      ) : null}
      {step === 'done' ? (
        <Button onPress={onClose} testID="verify-phone-done">
          {t('mailhub.findFriends.results.done')}
        </Button>
      ) : null}
    </BottomSheet>
  );
}

const DATA_SHARING_ITEMS = [
  { title: 'screens.settings.healthDataAnalytics', desc: 'screens.settings.shareAnonymizedHealthDataImproveAi' },
  { title: 'screens.settings.communityInsights', desc: 'screens.settings.allowYourProgressContributeCommunityStatistics' },
  { title: 'screens.settings.thirdpartyIntegrations', desc: 'screens.settings.shareDataWithConnectedAppsServices' },
] as const;

export function PrivacyDataSection(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { hasConsent, dialogOpen, setDialogOpen, grantConsent, revokeConsent } = useAIConsent();
  return (
    <>
      <SectionCard icon="Users" title={t('screens.mobilesettings.dataSharing')} testID="settings-privacy-data">
        {DATA_SHARING_ITEMS.map((item) => (
          <ToggleRow key={item.title} title={t(item.title)} description={t(item.desc)} checked={false} disabled testID={`settings-data-${item.title.split('.').pop()}`} />
        ))}
      </SectionCard>
      <SectionCard icon="Brain" title={t('screens.mobilesettings.aiDataSharing')} testID="settings-ai-data">
        <ToggleRow
          title={t('screens.mobilesettings.shareDataWithAiProvider')}
          description={t('screens.mobilesettings.allowPersonalDataSentThirdpartyAi')}
          checked={hasConsent}
          onChange={(checked) => (checked ? setDialogOpen(true) : revokeConsent())}
          testID="settings-ai-consent-switch"
        />
        <View style={[styles.quote, { borderColor: colors.muted }]}>
          <Text size="xs" muted>
            <Text size="xs" weight="700" muted>
              {t('screens.mobilesettings.data')}
            </Text>{' '}
            {t('screens.mobilesettings.voiceTranscriptsPromptsChatDiaryWellness')}
          </Text>
          <Text size="xs" muted>
            <Text size="xs" weight="700" muted>
              {t('screens.mobilesettings.recipients')}
            </Text>{' '}
            {t('screens.mobilesettings.googleGeminiAiCloudAi')}
          </Text>
          <Text size="xs" muted>
            <Text size="xs" weight="700" muted>
              {t('screens.mobilesettings.purpose')}
            </Text>{' '}
            {t('screens.mobilesettings.aiResponsesVoiceGreetingsHealthCoaching')}
          </Text>
        </View>
        <Text size="xs" muted testID="settings-ai-consent-state">
          {hasConsent ? t('screens.settings.consentGrantedYouCanRevokeAt') : t('screens.settings.aiFeaturesVoiceAssistantProactiveMessages')}
        </Text>
      </SectionCard>
      <SectionCard icon="Shield" title={t('screens.mobilesettings.dataExportControl')} testID="settings-data-export">
        {(
          [
            ['statusInfo', 'screens.mobilesettings.requestDataExportAnytime'],
            ['statusSuccess', 'screens.mobilesettings.deleteAccountAllData'],
            ['primary', 'screens.mobilesettings.viewAllDataSharingActivities'],
          ] as const
        ).map(([tone, key]) => (
          <View key={key} style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: colors[tone] }]} />
            <Text size="sm">{t(key)}</Text>
          </View>
        ))}
        <Button variant="outline" size="sm" disabled style={styles.selfStart} testID="settings-request-export">
          {t('screens.mobilesettings.requestDataExport')}
        </Button>
      </SectionCard>
      <AIDataConsentSheet open={dialogOpen} onClose={() => setDialogOpen(false)} onConsent={grantConsent} />
    </>
  );
}

/** `src/components/ai/AIDataConsentDialog.tsx` — the disclosure, then Not now / I agree. */
function AIDataConsentSheet({ open, onClose, onConsent }: { open: boolean; onClose: () => void; onConsent: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <BottomSheet open={open} onClose={onClose} title={t('settingsNative.consent.title')} testID="ai-consent-dialog">
      <Text size="sm" muted>
        {t('settingsNative.consent.subtitle')}
      </Text>
      <View style={styles.form}>
        <Text size="sm" weight="600">
          {t('settingsNative.consent.whatIsSent')}
        </Text>
        {['settingsNative.consent.voiceData', 'settingsNative.consent.diaryData', 'settingsNative.consent.memoryData', 'settingsNative.consent.profileData', 'settingsNative.consent.socialData'].map((k) => (
          <Text key={k} size="sm" muted>
            {t(k)}
          </Text>
        ))}
      </View>
      <View style={[styles.alert, { borderColor: colors.border }]}>
        <Text size="sm">
          <Text size="sm" weight="600">
            {t('settingsNative.consent.recipientLabel')}
          </Text>{' '}
          {t('settingsNative.consent.recipient')}
        </Text>
      </View>
      <View style={styles.form}>
        <Text size="sm" weight="600">
          {t('settingsNative.consent.purposeLabel')}
        </Text>
        <Text size="sm" muted>
          {t('settingsNative.consent.purpose')}
        </Text>
      </View>
      <View style={styles.form}>
        {['settingsNative.consent.notStored', 'settingsNative.consent.revokeAnytime', 'settingsNative.consent.gdprCompliant'].map((k) => (
          <View key={k} style={styles.bullet}>
            <SettingsIcon name="CheckCircle2" size={16} color={colors.primary} />
            <Text size="sm" style={styles.shrink}>
              {t(k)}
            </Text>
          </View>
        ))}
      </View>
      <Text size="xs" muted style={styles.center}>
        {t('settingsNative.consent.agreementFooter')}
      </Text>
      <View style={styles.sheetActions}>
        <Button variant="outline" onPress={onClose} testID="ai-consent-not-now">
          {t('settingsNative.consent.notNow')}
        </Button>
        <Button onPress={onConsent} testID="ai-consent-agree">
          {t('settingsNative.consent.iAgree')}
        </Button>
      </View>
    </BottomSheet>
  );
}

export function PrivacySecuritySection(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <SectionCard icon="Lock" title={t('screens.mobilesettings.security')} testID="settings-privacy-security">
      <SettingRow
        title={t('screens.mobilesettings.passwordProtection')}
        description={t('screens.mobilesettings.lastChanged30DaysAgo')}
        right={
          <Button variant="outline" size="sm" testID="settings-password-change">
            {t('screens.mobilesettings.change')}
          </Button>
        }
      />
      <ToggleRow title={t('screens.mobilesettings.twofactorAuthentication')} description={t('screens.mobilesettings.addExtraLayerSecurity')} defaultChecked={false} testID="settings-2fa" />
      <ToggleRow title={t('screens.mobilesettings.biometricLogin')} description={t('screens.mobilesettings.useFingerprintFaceRecognition')} defaultChecked={false} testID="settings-biometric" />
      <ToggleRow title={t('screens.mobilesettings.loginAlerts')} description={t('screens.mobilesettings.getNotifiedNewLogins')} defaultChecked testID="settings-login-alerts" />
      <Divider />
      <View style={styles.form}>
        <Text size="sm" weight="500">
          {t('screens.mobilesettings.activeSessions')}
        </Text>
        {(
          [
            { device: 'settingsNative.security.sessionPhone', current: true },
            { device: 'settingsNative.security.sessionLaptop', current: false },
          ] as const
        ).map((s) => (
          <View key={s.device} style={[styles.session, { backgroundColor: colors.muted }]}>
            <View style={styles.shrink}>
              <Text size="sm" weight="500">
                {t(s.device)}
              </Text>
              <Text size="xs" muted>
                {t('settingsNative.security.sessionLocation')}
              </Text>
            </View>
            {s.current ? (
              <Text size="xs" weight="500" color={colors.statusSuccess}>
                {t('screens.mobilesettings.current')}
              </Text>
            ) : (
              <Button variant="ghost" size="sm" textStyle={{ color: colors.destructive }}>
                {t('screens.mobilesettings.revoke')}
              </Button>
            )}
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16, paddingTop: 8 },
  stackTop: { paddingTop: 8 },
  phoneCard: { gap: 8 },
  phoneText: { gap: 2, minWidth: 0 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ltr: { writingDirection: 'ltr' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  form: { gap: 8 },
  quote: { borderStartWidth: 2, paddingStart: 12, gap: 4 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  selfStart: { alignSelf: 'flex-start', marginTop: 8 },
  alert: { borderWidth: 1, borderRadius: 12, padding: 12 },
  center: { textAlign: 'center' },
  shrink: { flexShrink: 1 },
  session: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
});
