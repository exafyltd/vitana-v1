/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — "Find Friends"
 * of the inbox Contacts tab, the native twin of the web `ImportContactsButton`
 * → `ContactSyncModal` (VTID-05058) with its parts:
 *  - consent (`ContactConsentCard`: three privacy points, Not now / Continue),
 *  - import: "Import contacts from my phone" (the whole address book behind
 *    one OS prompt, read only) — or, on a device without one, "Choose a
 *    contacts file (.vcf)" with the export help — then the account sources
 *    Google / Outlook / iCloud (`ContactSourcePicker hidePhone`, connected or
 *    "turn it on in Connected Apps first"),
 *  - syncing (progress for feel), results (`DedupePreviewList`: "Already on
 *    Vitanaland" with Message, "Invite" with the invite channels, search over
 *    8 rows, "show more" by 30; the totals line, over-limit line, the
 *    "later" line, `VerifyPhoneHint`, Done),
 *  - error (`ContactSyncErrorState`, Open Settings for a refused prompt),
 *  - connect (the account is off → Open Connected Apps).
 * `VerifyPhoneDialog` (number → 6-digit code → done) is ported with it.
 * Data: `./data/contact-sync`. React 19: `ReactElement`.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, BottomSheet, Button, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import { ContactSourceGlyph, InboxButtonIcon, InboxIcon, Input, Label, Progress, openAppSettings, pickContactsFile } from '../../ports/inbox';
import { openWebPath } from '../../ports/links';
import { getSupabase } from '../../auth/client';
import { useAuth } from '../../auth/AuthProvider';
import { useInboxText } from './text';
import {
  ConnectAppFirst,
  ContactFileError,
  HUB_APP,
  MAX_DEVICE_CONTACTS,
  PhoneVerifyRequestError,
  confirmPhoneCode,
  fetchConnectedApps,
  phoneStatusQueryKey,
  sendPhoneCode,
  useContactSync,
  usePhoneImportMode,
  usePhoneVerificationStatus,
  type ConnectedAppId,
  type ContactSource,
  type ImportedContact,
  type MatchedContact,
  type PhoneVerifyErrorCode,
  type SyncResult,
} from './data/contact-sync';
import type { InviteTarget } from './data/contacts';

type Step = 'consent' | 'import' | 'syncing' | 'results' | 'error' | 'connect';
export type ContactSyncErrorType = 'oauth_failed' | 'api_unavailable' | 'permission_denied' | 'rate_limited' | 'cancelled' | 'file_too_large' | 'file_empty' | 'unknown';

const ACCOUNT_SOURCES: ReadonlyArray<{ id: 'google' | 'outlook' | 'icloud'; nameKey: string }> = [
  { id: 'google', nameKey: 'mailhub.apps.google-contacts.name' },
  { id: 'outlook', nameKey: 'mailhub.apps.outlook-contacts.name' },
  { id: 'icloud', nameKey: 'mailhub.apps.iphone-contacts.name' },
];

/** The web's error mapping (ContactSyncModal.tsx:103-117). */
export function syncErrorType(error: unknown): ContactSyncErrorType {
  if (error instanceof ContactFileError) return error.code === 'too_large' ? 'file_too_large' : 'file_empty';
  const msg = error instanceof Error ? error.message : '';
  if (/cancelled/i.test(msg)) return 'cancelled';
  if (/Contact Picker API not available|native_contacts_unavailable/i.test(msg)) return 'api_unavailable';
  if (/permission/i.test(msg)) return 'permission_denied';
  if (/rate|429/i.test(msg)) return 'rate_limited';
  if (/oauth|auth|not_connected/i.test(msg)) return 'oauth_failed';
  return 'unknown';
}

/** The "Find Friends" button (web `ImportContactsButton`) with its sheet. */
type RenderInvite = (target: InviteTarget | null, onClose: () => void, onInvited: (id: string) => void) => ReactElement;

export function FindFriendsButton({
  size = 'default',
  onImportComplete,
  renderInvite,
  testID = 'find-friends-button',
}: {
  size?: 'default' | 'lg';
  onImportComplete?: () => void;
  renderInvite?: RenderInvite;
  testID?: string;
}): ReactElement {
  const { t } = useInboxText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button testID={testID} size={size} onPress={() => setOpen(true)} style={styles.findButton}>
        <InboxButtonIcon name="Users" />
        {t('screens.contacts.findFriends')}
        <InboxButtonIcon name="Sparkles" size={12} />
      </Button>
      <FindFriendsSheet open={open} onClose={() => setOpen(false)} onComplete={onImportComplete} renderInvite={renderInvite} />
    </>
  );
}

export function FindFriendsSheet({
  open,
  onClose,
  onComplete,
  renderInvite,
}: {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** The invite channels for a contact (ContactsTab's InviteSheet); injected so the two share one flow. */
  renderInvite?: RenderInvite;
}): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  const mode = usePhoneImportMode();
  const { hasConsented, recordConsent, syncContacts, importContactFile } = useContactSync();
  const [step, setStep] = useState<Step>('consent');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [errorType, setErrorType] = useState<ContactSyncErrorType>('unknown');
  const [connectApp, setConnectApp] = useState<ConnectedAppId | null>(null);
  const [connected, setConnected] = useState<ContactSource[]>([]);
  const [inviteTarget, setInviteTarget] = useState<InviteTarget | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setStep(hasConsented ? 'import' : 'consent');
    setProgress(0);
    setResult(null);
    setConnectApp(null);
    setInvited(new Set());
    fetchConnectedApps()
      .then((apps) => {
        const on = new Set(apps.filter((a) => a.status === 'on').map((a) => a.id));
        setConnected(ACCOUNT_SOURCES.filter((s) => on.has(HUB_APP[s.id] as string)).map((s) => s.id));
      })
      .catch(() => setConnected([]));
  }, [open, hasConsented]);

  const run = async (work: () => Promise<SyncResult>) => {
    setStep('syncing');
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 10, 90)), 300);
    try {
      const r = await work();
      setProgress(100);
      setResult(r);
      setStep('results');
      onComplete?.();
    } catch (error) {
      if (error instanceof ConnectAppFirst) {
        setConnectApp(error.app);
        setStep('connect');
        return;
      }
      setErrorType(syncErrorType(error));
      setStep('error');
    } finally {
      clearInterval(timer);
    }
  };

  const importFrom = (sources: ContactSource[]) => run(() => syncContacts(sources, mode ?? 'file'));
  const importFile = async () => {
    const file = await pickContactsFile().catch(() => null);
    if (file) void run(() => importContactFile(file));
  };
  const message = (userId: string) => {
    onClose();
    openWebPath(`/inbox/u/${userId}`);
  };

  let body: ReactElement | null = null;
  if (step === 'consent') {
    const bullets = [
      { icon: 'Lock', title: 'noAutoTitle', body: 'noAutoBody' },
      { icon: 'Eye', title: 'privateTitle', body: 'privateBody' },
      { icon: 'UserCheck', title: 'removeTitle', body: 'removeBody' },
    ];
    body = (
      <View testID="find-friends-consent" style={styles.block}>
        <View style={styles.rowCenter}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
            <InboxIcon name="Shield" size={24} color={colors.primary} />
          </View>
          <View style={styles.fill}>
            <Text size="lg" weight="600">
              {t('mailhub.findFriends.consent.title')}
            </Text>
            <Text size="sm" muted>
              {t('mailhub.findFriends.consent.subtitle')}
            </Text>
          </View>
        </View>
        {bullets.map((b) => (
          <View key={b.title} style={styles.bullet}>
            <View style={[styles.bulletIcon, { backgroundColor: colors.muted }]}>
              <InboxIcon name={b.icon} size={16} color={colors.primary} />
            </View>
            <View style={styles.fill}>
              <Text size="sm" weight="500">
                {t(`mailhub.findFriends.consent.${b.title}`)}
              </Text>
              <Text size="xs" muted>
                {t(`mailhub.findFriends.consent.${b.body}`)}
              </Text>
            </View>
          </View>
        ))}
        <Text size="xs" muted style={[styles.helper, { backgroundColor: colors.muted }]}>
          {t('mailhub.findFriends.consent.helper')}
        </Text>
        <View style={styles.twoButtons}>
          <Button variant="ghost" onPress={onClose} style={styles.fill}>
            {t('mailhub.findFriends.consent.notNow')}
          </Button>
          <Button
            testID="find-friends-consent-continue"
            onPress={() => {
              recordConsent();
              setStep('import');
            }}
            style={styles.fill}
          >
            {t('mailhub.findFriends.consent.continue')}
          </Button>
        </View>
      </View>
    );
  } else if (step === 'import') {
    body = (
      <View testID="find-friends-import" style={styles.block}>
        <View style={styles.centered}>
          <Text size="lg" weight="600" style={styles.center}>
            {t('mailhub.findFriends.import.title')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('mailhub.findFriends.import.subtitle')}
          </Text>
        </View>
        {mode === null ? (
          <Spinner accessibilityLabel={t('loading.default')} />
        ) : mode === 'file' ? (
          <View style={styles.block}>
            <Button testID="find-friends-file" onPress={() => void importFile()} style={styles.big}>
              <InboxButtonIcon name="FileUp" size={20} />
              {t('mailhub.findFriends.import.file')}
            </Button>
            <View testID="find-friends-file-help" style={[styles.helpBox, { backgroundColor: colors.muted }]}>
              <Text size="xs" weight="500">
                {t('mailhub.findFriends.import.fileHowTitle')}
              </Text>
              <Text size="xs" muted>
                {t('mailhub.findFriends.import.fileHowIphone')}
              </Text>
              <Text size="xs" muted>
                {t('mailhub.findFriends.import.fileHowAndroid')}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.block}>
            <Button testID="find-friends-phone" onPress={() => void importFrom(['phonebook'])} style={styles.big}>
              <InboxButtonIcon name="Smartphone" size={20} />
              {t('mailhub.findFriends.import.phone')}
            </Button>
            <Text size="xs" muted style={styles.center}>
              {t('mailhub.findFriends.import.phoneHintNative')}
            </Text>
          </View>
        )}
        <View style={styles.block}>
          <Text size="xs" weight="500" muted>
            {t('mailhub.findFriends.import.accounts')}
          </Text>
          {ACCOUNT_SOURCES.map((s) => {
            const on = connected.includes(s.id);
            return (
              <PressableRow key={s.id} testID={`find-friends-source-${s.id}`} onPress={() => void importFrom([s.id])} style={[styles.source, { borderColor: colors.border }]}>
                <View style={[styles.sourceIcon, { backgroundColor: colors.muted }]}>
                  <ContactSourceGlyph source={s.id} />
                </View>
                <View style={styles.fill}>
                  <Text size="sm" weight="500">
                    {t(s.nameKey)}
                  </Text>
                  <Text size="xs" muted>
                    {t(on ? 'mailhub.findFriends.status.on' : 'mailhub.findFriends.status.off')}
                  </Text>
                </View>
                {on ? (
                  <Text size="xs" weight="500" color={colors.statusSuccess} testID={`find-friends-source-${s.id}-connected`}>
                    {t('screens.contacts.connected')}
                  </Text>
                ) : null}
              </PressableRow>
            );
          })}
        </View>
      </View>
    );
  } else if (step === 'syncing') {
    body = (
      <View testID="find-friends-syncing" style={[styles.block, styles.centered]}>
        <Spinner accessibilityLabel={t('screens.contacts.findingYourFriends')} />
        <Text size="lg" weight="600" style={styles.center}>
          {t('screens.contacts.findingYourFriends')}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t('screens.contacts.securelyMatchingYourContacts')}
        </Text>
        <Progress value={progress} style={styles.progress} />
        <Text size="xs" muted>
          {t(progress < 50 ? 'mailhub.findFriends.progress.reading' : 'mailhub.findFriends.progress.matching')}
        </Text>
      </View>
    );
  } else if (step === 'results' && result) {
    body = (
      <View testID="find-friends-results" style={styles.block}>
        <Text size="sm" weight="500" style={styles.center} testID="find-friends-summary">
          {t('mailhub.findFriends.results.summary', { total: result.totalImported, members: result.totalMatches })}
        </Text>
        {result.overLimit ? (
          <Text size="xs" muted style={styles.center}>
            {t('mailhub.findFriends.results.overLimit', { limit: MAX_DEVICE_CONTACTS })}
          </Text>
        ) : null}
        <DedupePreviewList matches={result.matches} nonMatches={result.nonMatches} invited={invited} onMessage={message} onInvite={setInviteTarget} />
        <Text size="xs" muted style={styles.center}>
          {t('mailhub.findFriends.results.later')}
        </Text>
        <VerifyPhoneHint />
        <Button variant="outline" testID="find-friends-done" onPress={onClose}>
          {t('mailhub.findFriends.results.done')}
        </Button>
      </View>
    );
  } else if (step === 'error') {
    const danger = errorType === 'oauth_failed' || errorType === 'permission_denied' || errorType === 'unknown';
    body = (
      <View testID="find-friends-error" style={[styles.block, styles.centered]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <InboxIcon name={errorType === 'oauth_failed' || errorType === 'permission_denied' ? 'ShieldX' : 'AlertCircle'} size={32} color={danger ? colors.destructive : errorType === 'cancelled' ? colors.mutedForeground : colors.statusWarning} />
        </View>
        <Text size="lg" weight="600" style={styles.center}>
          {t(`mailhub.findFriends.errors.${errorType}.title`)}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t(`mailhub.findFriends.errors.${errorType}.body`)}
        </Text>
        <View style={styles.stack}>
          {errorType === 'permission_denied' ? (
            <Button variant="outline" testID="find-friends-open-settings" onPress={openAppSettings}>
              <InboxButtonIcon name="Settings" />
              {t('screens.contacts.openSettings')}
            </Button>
          ) : null}
          <Button testID="find-friends-retry" onPress={() => setStep('import')}>
            <InboxButtonIcon name="RefreshCw" />
            {t('screens.contacts.tryAgain')}
          </Button>
          <Button variant="ghost" onPress={() => setStep('import')}>
            {t('screens.contacts.goBack')}
          </Button>
        </View>
      </View>
    );
  } else if (step === 'connect') {
    const app = connectApp ? t(`mailhub.apps.${connectApp}.name`) : '';
    body = (
      <View testID="find-friends-connect" style={[styles.block, styles.centered]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <InboxIcon name="Link2" size={32} color={colors.primary} />
        </View>
        <Text size="lg" weight="600" style={styles.center}>
          {t('mailhub.findFriends.connect.title', { app })}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t('mailhub.findFriends.connect.body', { app })}
        </Text>
        <View style={styles.stack}>
          <Button
            testID="find-friends-open-connected-apps"
            onPress={() => {
              onClose();
              openWebPath('/connectors');
            }}
          >
            {t('mailhub.findFriends.connect.open')}
          </Button>
          <Button variant="ghost" onPress={() => setStep('import')}>
            {t('screens.contacts.goBack')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <>
      <BottomSheet testID="find-friends-sheet" open={open} onClose={onClose} title={t('screens.contacts.findFriendsFromYourContacts')}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          {body}
        </ScrollView>
      </BottomSheet>
      {renderInvite?.(inviteTarget, () => setInviteTarget(null), (id) => setInvited((prev) => new Set(prev).add(id)))}
    </>
  );
}

/** `DedupePreviewList`: members with Message, everyone else with Invite; search over 8 rows; 30 more at a time. */
function DedupePreviewList({
  matches,
  nonMatches,
  invited,
  onMessage,
  onInvite,
  pageSize = 30,
}: {
  matches: MatchedContact[];
  nonMatches: ImportedContact[];
  invited: Set<string>;
  onMessage: (userId: string) => void;
  onInvite: (target: InviteTarget) => void;
  pageSize?: number;
}): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(pageSize);
  const q = query.trim().toLowerCase();
  const hit = (name: string, phone?: string, email?: string) => !q || name.toLowerCase().includes(q) || (phone ?? '').includes(q) || (email ?? '').toLowerCase().includes(q);
  const visibleMatches = useMemo(() => matches.filter((m) => hit(m.platformUser.display_name || m.localContact.name, m.localContact.phone, m.localContact.email)), [matches, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const others = useMemo(() => nonMatches.filter((c) => hit(c.name, c.phone, c.email)), [nonMatches, q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (matches.length === 0 && nonMatches.length === 0) {
    return (
      <Text size="sm" muted style={[styles.center, styles.pad]}>
        {t('screens.contacts.noContactsFound')}
      </Text>
    );
  }
  return (
    <View style={styles.block}>
      {matches.length + nonMatches.length > 8 ? (
        <View style={[styles.searchBox, { borderColor: colors.input }]}>
          <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
          <Input testID="find-friends-search" value={query} onChangeText={setQuery} placeholder={t('mailhub.findFriends.results.search')} accessibilityLabel={t('mailhub.findFriends.results.search')} style={styles.searchInput} />
        </View>
      ) : null}
      {visibleMatches.length > 0 ? (
        <View testID="find-friends-on-platform" style={styles.block}>
          <View style={styles.rowCenter}>
            <InboxIcon name="Check" size={14} color={colors.statusSuccess} />
            <Text size="sm" weight="500">
              {t('mailhub.findFriends.results.onPlatform', { count: matches.length })}
            </Text>
          </View>
          {visibleMatches.map((m) => (
            <View key={m.platformUser.user_id} style={[styles.resultRow, { backgroundColor: colors.statusSuccessSubtle }]}>
              <Avatar uri={m.platformUser.avatar_url} fallback={(m.platformUser.display_name || '?').charAt(0).toUpperCase()} size={40} />
              <View style={styles.fill}>
                <Text size="sm" weight="500" numberOfLines={1}>
                  {m.platformUser.display_name}
                </Text>
                <Text size="xs" muted numberOfLines={1}>
                  {m.platformUser.handle ? `@${m.platformUser.handle}` : m.localContact.name}
                </Text>
              </View>
              <Button size="sm" testID={`message-member-${m.platformUser.user_id}`} accessibilityLabel={t('mailhub.findFriends.results.message')} onPress={() => onMessage(m.platformUser.user_id)}>
                <InboxButtonIcon name="MessageCircle" />
              </Button>
            </View>
          ))}
        </View>
      ) : null}
      {others.length > 0 ? (
        <View testID="find-friends-to-invite" style={styles.block}>
          <View style={styles.rowCenter}>
            <InboxIcon name="UserPlus" size={14} color={colors.primary} />
            <Text size="sm" weight="500">
              {t('mailhub.findFriends.results.toInvite', { count: nonMatches.length })}
            </Text>
          </View>
          {others.slice(0, shown).map((c) => {
            const done = invited.has(c.id);
            return (
              <View key={c.id} style={[styles.resultRow, { borderColor: colors.border, backgroundColor: colors.card, borderWidth: 1 }]}>
                <Avatar fallback={(c.name || '?').charAt(0).toUpperCase()} size={40} />
                <View style={styles.fill}>
                  <Text size="sm" weight="500" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text size="xs" muted numberOfLines={1} style={c.phone || c.email ? styles.ltr : undefined}>
                    {c.phone || c.email || t('mailhub.findFriends.results.noContactInfo')}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant={done ? 'ghost' : 'outline'}
                  testID={`invite-contact-${c.id}`}
                  accessibilityLabel={t(done ? 'mailhub.findFriends.results.invited' : 'mailhub.findFriends.results.invite')}
                  onPress={() => onInvite({ id: c.id, name: c.name, phone: c.phone, phoneE164: c.phoneE164, email: c.email })}
                >
                  <InboxButtonIcon name="Send" />
                </Button>
              </View>
            );
          })}
          {others.length > shown ? (
            <Button variant="ghost" size="sm" testID="find-friends-more" onPress={() => setShown((n) => n + pageSize)}>
              {t('screens.contacts.showValue0More', { value0: others.length - shown })}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** `VerifyPhoneHint`: shown only while the gateway switch is on and the member's number is not verified. */
function VerifyPhoneHint(): ReactElement | null {
  const { t } = useInboxText();
  const { colors } = useUITheme();
  const status = usePhoneVerificationStatus();
  const [open, setOpen] = useState(false);
  if (!status || status.verified) return null;
  return (
    <View testID="verify-phone-hint" style={styles.hint}>
      <InboxIcon name="Smartphone" size={14} color={colors.mutedForeground} />
      <Text size="xs" muted>
        {t('mailhub.findFriends.verifyPhone.hint')}
      </Text>
      <Button variant="link" size="sm" testID="verify-phone-hint-action" onPress={() => setOpen(true)}>
        {t('mailhub.findFriends.verifyPhone.hintAction')}
      </Button>
      <VerifyPhoneDialog open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/** `VerifyPhoneDialog`: number → 6-digit SMS code → done. */
function VerifyPhoneDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { t } = useInboxText();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'number' | 'code' | 'done'>('number');
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
    void getSupabase()
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const typed = (data as { phone?: string | null } | null)?.phone;
        if (typed) setPhone((cur) => cur || typed);
      });
  }, [open, user?.id]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const codeOf = (err: unknown): PhoneVerifyErrorCode => (err instanceof PhoneVerifyRequestError ? err.code : 'unknown');

  const send = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const out = await sendPhoneCode(phone.trim());
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
      await queryClient.invalidateQueries({ queryKey: phoneStatusQueryKey(user?.id) });
      await queryClient.invalidateQueries({ queryKey: ['phone-discoverability', user?.id ?? null] });
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
    <BottomSheet testID="verify-phone-dialog" open={open} onClose={onClose} title={t('mailhub.findFriends.verifyPhone.dialogTitle')}>
      <View style={styles.block}>
        <Text size="sm" muted>
          {step === 'code' && sentTo ? `${t('mailhub.findFriends.verifyPhone.codeHelp')} ${sentTo}` : step === 'done' ? t('mailhub.findFriends.verifyPhone.done') : t('mailhub.findFriends.verifyPhone.numberHelp')}
        </Text>
        {step === 'number' ? (
          <>
            <Label>{t('mailhub.findFriends.verifyPhone.numberLabel')}</Label>
            <Input testID="verify-phone-number" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" value={phone} onChangeText={setPhone} style={styles.ltr} />
            {errorLine}
            <Button testID="verify-phone-send" disabled={busy || !phone.trim()} onPress={() => void send()}>
              {t('mailhub.findFriends.verifyPhone.sendCode')}
            </Button>
          </>
        ) : null}
        {step === 'code' ? (
          <>
            <Label>{t('mailhub.findFriends.verifyPhone.codeLabel')}</Label>
            <Input testID="verify-phone-code" keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} style={[styles.ltr, styles.code]} />
            {errorLine}
            <Button testID="verify-phone-confirm" disabled={busy || code.length !== 6} onPress={() => void confirm()}>
              {t('mailhub.findFriends.verifyPhone.confirm')}
            </Button>
            <View style={styles.twoButtons}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setError(null);
                  setStep('number');
                }}
              >
                {t('mailhub.findFriends.verifyPhone.changeNumber')}
              </Button>
              <Button variant="ghost" size="sm" testID="verify-phone-resend" disabled={busy || resendIn > 0} onPress={() => void send()}>
                {resendIn > 0 ? t('mailhub.findFriends.verifyPhone.resendIn', { seconds: resendIn }) : t('mailhub.findFriends.verifyPhone.resend')}
              </Button>
            </View>
          </>
        ) : null}
        {step === 'done' ? (
          <View style={styles.centered}>
            <InboxIcon name="CheckCircle2" size={48} color={colors.primary} />
            <Button testID="verify-phone-close" onPress={onClose}>
              {t('mailhub.findFriends.results.done')}
            </Button>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  body: { paddingBottom: 24 },
  block: { gap: 12 },
  stack: { gap: 8, alignSelf: 'stretch' },
  centered: { alignItems: 'center', gap: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  helper: { borderRadius: 8, padding: 12 },
  twoButtons: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  big: { minHeight: 48 },
  helpBox: { borderRadius: 12, padding: 12, gap: 4 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56, borderRadius: 12, borderWidth: 1 },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progress: { alignSelf: 'stretch', height: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  ltr: { writingDirection: 'ltr' },
  code: { textAlign: 'center', fontSize: 18, letterSpacing: 8 },
  pad: { paddingVertical: 32 },
  hint: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6 },
  findButton: { gap: 8 },
});
