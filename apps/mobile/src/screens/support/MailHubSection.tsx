/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twin of the
 * Mail, Calendar & Contacts section on the mobile Connected Apps view
 * (`MailCalendarContactsSection.tsx` + `MailCalendarContactsPanel.tsx`): one
 * switch per app, driven by the gateway hub (GET /api/v1/connected-apps), so a
 * switch is only offered when the backend can honour it.
 *
 * Switching on POSTs `/connected-apps/:id/connect` (`return: 'mobile'`); a
 * `consent_required` reply hands the provider's URL to `openConsentUrl` and
 * watches the hub until the app is on (the return leg from the provider is the
 * G1 device pass). Apple apps first ask for the Apple ID + app-specific
 * password. Switching off asks first, then POSTs `/disconnect`. "Sync now"
 * POSTs `/sync`. Every one of these is a write, mocked in tests. Android
 * contacts need the phone's contact picker, which the native app does not ship
 * yet, so it shows the web's "not supported here" help.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  BottomSheet,
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icon,
  Switch,
  Text,
  TextInput,
  notify,
  notifyError,
  useUITheme,
} from '../../ports/ui';
import { openConsentUrl } from '../../ports/support';
import { useI18n } from '../../i18n/I18nProvider';
import { formatAgo } from './format';
import {
  APP_ORDER,
  CONNECTED_APPS_QUERY_KEY,
  ConnectedAppsError,
  connectApp,
  disconnectApp,
  fetchConnectedApps,
  syncConnectedApp,
  type AppKind,
  type ConnectedAppId,
  type ConnectedAppState,
} from './data/connectors';

const APP_EMOJI: Record<ConnectedAppId, string> = {
  gmail: '📧',
  'outlook-mail': '📨',
  'apple-mail': '✉',
  'google-calendar': '📅',
  'outlook-calendar': '🗓',
  'apple-calendar': '📆',
  'google-contacts': '👥',
  'outlook-contacts': '📇',
  'iphone-contacts': '📱',
  'android-contacts': '🤖',
};

const KIND_EMOJI: Record<AppKind, string> = { mail: '📬', calendar: '📅', contacts: '👥' };

type Busy = { id: ConnectedAppId; to: 'on' | 'off' } | null;

export function MailHubSection({ title, defaultExpanded = false }: { title: string; defaultExpanded?: boolean }): ReactElement {
  const { colors } = useUITheme();
  const [open, setOpen] = useState(defaultExpanded);
  const apps = useQuery({ queryKey: CONNECTED_APPS_QUERY_KEY, queryFn: fetchConnectedApps, staleTime: 15_000 });
  const on = (apps.data ?? []).filter((a) => a.status === 'on').length;
  const total = apps.data?.length ?? 9;
  return (
    <Collapsible open={open} onOpenChange={setOpen} testID="mailhub-section">
      <CollapsibleTrigger
        testID="mailhub-section-trigger"
        accessibilityLabel={title}
        style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.row}>
          <Text size="lg">📅</Text>
          <Text size="sm" weight="500">
            {title}
          </Text>
        </View>
        <View style={styles.row}>
          <Badge variant={on > 0 ? 'default' : 'secondary'}>{`${on}/${total}`}</Badge>
          <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={16} color={colors.mutedForeground} />
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent style={styles.content}>
        <MailHubPanel />
      </CollapsibleContent>
    </Collapsible>
  );
}

function MailHubPanel(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<Busy>(null);
  const [pendingConsent, setPendingConsent] = useState<ConnectedAppId | null>(null);
  const [appleFor, setAppleFor] = useState<ConnectedAppId | null>(null);
  const [offFor, setOffFor] = useState<ConnectedAppState | null>(null);
  const [androidHelp, setAndroidHelp] = useState(false);

  const apps = useQuery({
    queryKey: CONNECTED_APPS_QUERY_KEY,
    queryFn: fetchConnectedApps,
    staleTime: 15_000,
    // While a consent finishes in the phone's browser, watch for the app to come on.
    refetchInterval: pendingConsent ? 3_000 : false,
    retry: (n, err) => !(err instanceof ConnectedAppsError && err.status === 401) && n < 2,
  });

  const byId = useMemo(() => {
    const m = new Map<ConnectedAppId, ConnectedAppState>();
    for (const a of apps.data ?? []) m.set(a.id, a);
    return m;
  }, [apps.data]);

  const appName = (id: ConnectedAppId) => t(`mailhub.apps.${id}.name`);

  // Stop watching once the pending app is on, or after two minutes.
  useEffect(() => {
    if (!pendingConsent) return;
    if (byId.get(pendingConsent)?.status === 'on') {
      notify('mailhub.toasts.turnedOn', undefined, { app: appName(pendingConsent) });
      setPendingConsent(null);
      return;
    }
    const timer = setTimeout(() => setPendingConsent(null), 120_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConsent, byId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY });

  const turnOn = useMutation({
    mutationFn: (vars: { id: ConnectedAppId; apple?: { apple_id: string; app_password: string } }) => connectApp(vars.id, vars.apple),
    onMutate: (vars) => setBusy({ id: vars.id, to: 'on' }),
    onSuccess: async (out, vars) => {
      if (out.status === 'consent_required') {
        setPendingConsent(vars.id);
        await openConsentUrl(out.auth_url);
        return;
      }
      setAppleFor(null);
      notify('mailhub.toasts.turnedOn', undefined, { app: appName(vars.id) });
      if (out.sync && !out.sync.ok) notifyError('mailhub.toasts.firstSyncFailed');
      void refresh();
    },
    onError: (err) => {
      const code = err instanceof ConnectedAppsError ? err.code : '';
      if (code === 'apple_auth_failed') notifyError('mailhub.apple.wrongPassword');
      else if (code === 'apple_unreachable') notifyError('mailhub.apple.unreachable');
      else if (code === 'not_configured') notifyError('mailhub.toasts.notAvailable');
      else notifyError('mailhub.toasts.couldNotTurnOn');
    },
    onSettled: () => setBusy(null),
  });

  const turnOff = useMutation({
    mutationFn: (vars: { id: ConnectedAppId; removeData: boolean }) => disconnectApp(vars.id, vars.removeData),
    onMutate: (vars) => setBusy({ id: vars.id, to: 'off' }),
    onSuccess: (_r, vars) => {
      setOffFor(null);
      notify('mailhub.toasts.turnedOff', undefined, { app: appName(vars.id) });
      void refresh();
      void queryClient.invalidateQueries({ queryKey: ['calendar-window'] });
    },
    onError: () => notifyError('mailhub.toasts.couldNotTurnOff'),
    onSettled: () => setBusy(null),
  });

  const syncNow = useMutation({
    mutationFn: (id: ConnectedAppId) => syncConnectedApp(id),
    onMutate: (id) => setBusy({ id, to: 'on' }),
    onSuccess: (r) => {
      if (r.ok) notify('mailhub.toasts.synced');
      else notifyError('mailhub.toasts.syncFailed');
      void refresh();
      void queryClient.invalidateQueries({ queryKey: ['calendar-window'] });
    },
    onError: () => notifyError('mailhub.toasts.syncFailed'),
    onSettled: () => setBusy(null),
  });

  const onToggle = (app: ConnectedAppState, next: boolean) => {
    if (!next) {
      setOffFor(app);
      return;
    }
    // No contact picker in the native app yet (web: contactPickerSupported() === false).
    if (app.id === 'android-contacts') {
      setAndroidHelp(true);
      return;
    }
    if (app.method === 'app_password' && !(apps.data ?? []).some((a) => a.provider === 'apple' && a.status === 'on')) {
      setAppleFor(app.id);
      return;
    }
    turnOn.mutate({ id: app.id });
  };

  const subline = (app: ConnectedAppState): { text: string; tone: 'muted' | 'ok' | 'warn' } => {
    if (pendingConsent === app.id) return { text: t('mailhub.status.finishInBrowser'), tone: 'warn' };
    if (app.availability !== 'ready') return { text: t('mailhub.status.notAvailable'), tone: 'muted' };
    if (app.status === 'needs_reconnect') return { text: t('mailhub.status.needsReconnect'), tone: 'warn' };
    if (app.status === 'off') return { text: t(`mailhub.apps.${app.id}.what`), tone: 'muted' };
    const parts: string[] = [];
    if (app.account) parts.push(app.account);
    if (app.last_error) return { text: t('mailhub.status.syncProblem'), tone: 'warn' };
    const r = app.last_result ?? {};
    if (typeof r.imported === 'number') parts.push(t('mailhub.status.contactsCount', { count: r.imported }));
    else if (typeof r.busy === 'number') parts.push(t('mailhub.status.busyCount', { count: r.busy }));
    if (app.last_sync_at) parts.push(t('mailhub.status.syncedAgo', { ago: formatAgo(app.last_sync_at, locale) }));
    return { text: parts.length ? parts.join(' · ') : t('mailhub.status.on'), tone: 'ok' };
  };

  if (apps.isError) {
    const expired = apps.error instanceof ConnectedAppsError && apps.error.status === 401;
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} testID="mailhub-error">
        <Text size="sm" muted>
          {expired ? t('mailhub.errors.sessionExpired') : t('mailhub.errors.loadFailed')}
        </Text>
      </View>
    );
  }

  const toneColor = { warn: colors.statusWarning, ok: colors.statusSuccess, muted: colors.mutedForeground };

  return (
    <View style={styles.panel} testID="mailhub-panel">
      <Text size="sm" muted>
        {t('mailhub.intro')}
      </Text>
      {(Object.keys(APP_ORDER) as AppKind[]).map((kind) => (
        <View key={kind} style={styles.kind}>
          <Text size="sm" weight="600" muted accessibilityRole="header">
            {`${KIND_EMOJI[kind]} ${t(`mailhub.kinds.${kind}`)}`}
          </Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {APP_ORDER[kind].map((id) => {
              const app = byId.get(id);
              const loading = apps.isLoading || !app;
              const rowBusy = busy?.id === id;
              const line = app ? subline(app) : { text: '', tone: 'muted' as const };
              const checked = !!app && (rowBusy ? busy?.to === 'on' : app.status !== 'off');
              const disabled = loading || rowBusy || (app?.availability !== 'ready' && app?.status === 'off');
              return (
                <View key={id} style={styles.appRow} testID={`mailhub-row-${id}`}>
                  <View style={[styles.emoji, { backgroundColor: colors.muted }]}>
                    <Text size="lg">{APP_EMOJI[id]}</Text>
                  </View>
                  <View style={styles.fill}>
                    <Text weight="500" numberOfLines={1}>
                      {appName(id)}
                    </Text>
                    <Text size="xs" numberOfLines={1} color={toneColor[line.tone]}>
                      {loading ? t('mailhub.status.loading') : line.text}
                    </Text>
                    {app && app.status !== 'off' && (app.syncs || app.status === 'needs_reconnect') ? (
                      <View style={styles.row}>
                        {app.status === 'needs_reconnect' ? (
                          <Button
                            variant="link"
                            size="xs"
                            disabled={rowBusy || app.availability !== 'ready'}
                            onPress={() => (app.method === 'app_password' ? setAppleFor(app.id) : turnOn.mutate({ id: app.id }))}
                            testID={`mailhub-reconnect-${id}`}
                          >
                            {t('mailhub.actions.reconnect')}
                          </Button>
                        ) : app.id === 'android-contacts' ? (
                          <Button variant="link" size="xs" disabled={rowBusy} onPress={() => setAndroidHelp(true)}>
                            {t('mailhub.actions.addMore')}
                          </Button>
                        ) : (
                          <Button variant="link" size="xs" disabled={rowBusy} onPress={() => syncNow.mutate(app.id)} testID={`mailhub-sync-${id}`}>
                            {t('mailhub.actions.syncNow')}
                          </Button>
                        )}
                      </View>
                    ) : null}
                  </View>
                  <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => app && onToggle(app, v)}
                    accessibilityLabel={t('mailhub.actions.toggleAria', { app: appName(id) })}
                    testID={`mailhub-toggle-${id}`}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <AppleSignInSheet
        appId={appleFor}
        busy={turnOn.isPending}
        onClose={() => setAppleFor(null)}
        onSubmit={(apple_id, app_password) => appleFor && turnOn.mutate({ id: appleFor, apple: { apple_id, app_password } })}
      />
      <TurnOffSheet
        app={offFor}
        busy={turnOff.isPending}
        onClose={() => setOffFor(null)}
        onConfirm={(removeData) => offFor && turnOff.mutate({ id: offFor.id, removeData })}
      />
      <BottomSheet open={androidHelp} onClose={() => setAndroidHelp(false)} title={`🤖 ${t('mailhub.android.title')}`} testID="mailhub-android-help">
        <Text size="sm" muted>
          {t('mailhub.android.body')}
        </Text>
        <Button onPress={() => setAndroidHelp(false)}>{t('mailhub.actions.gotIt')}</Button>
      </BottomSheet>
    </View>
  );
}

function AppleSignInSheet({
  appId,
  busy,
  onClose,
  onSubmit,
}: {
  appId: ConnectedAppId | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (appleId: string, password: string) => void;
}): ReactElement {
  const { t } = useI18n();
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    if (!appId) setPassword('');
  }, [appId]);
  const valid = /.+@.+/.test(appleId.trim()) && password.replace(/\s+/g, '').length >= 16;
  return (
    <BottomSheet open={!!appId} onClose={onClose} title={`🍎 ${t('mailhub.apple.title')}`} testID="mailhub-apple-dialog">
      <View style={styles.form}>
        <Text size="sm" muted>
          {t('mailhub.apple.intro')}
        </Text>
        <Text size="sm" muted>{`1. ${t('mailhub.apple.step1')} account.apple.com`}</Text>
        <Text size="sm" muted>{`2. ${t('mailhub.apple.step2')}`}</Text>
        <Text size="sm" muted>{`3. ${t('mailhub.apple.step3')}`}</Text>
        <Text size="sm" weight="500">
          {t('mailhub.apple.appleId')}
        </Text>
        <TextInput
          testID="mailhub-apple-id"
          value={appleId}
          onChangeText={setAppleId}
          autoCapitalize="none"
          autoComplete="username"
          keyboardType="email-address"
          accessibilityLabel={t('mailhub.apple.appleId')}
        />
        <Text size="sm" weight="500">
          {t('mailhub.apple.appPassword')}
        </Text>
        <TextInput
          testID="mailhub-apple-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder={t('mailhub.apple.passwordPlaceholder')}
          accessibilityLabel={t('mailhub.apple.appPassword')}
        />
        <Text size="xs" muted>{`🔒 ${t('mailhub.apple.privacy')}`}</Text>
        <View style={styles.row}>
          <Button variant="outline" onPress={onClose}>
            {t('mailhub.actions.cancel')}
          </Button>
          <Button disabled={!valid || busy} onPress={() => onSubmit(appleId.trim(), password)} testID="mailhub-apple-submit">
            {busy ? t('mailhub.apple.checking') : t('mailhub.apple.connect')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

function TurnOffSheet({
  app,
  busy,
  onClose,
  onConfirm,
}: {
  app: ConnectedAppState | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (removeData: boolean) => void;
}): ReactElement {
  const { t } = useI18n();
  const [removeData, setRemoveData] = useState(false);
  useEffect(() => setRemoveData(false), [app?.id]);
  const name = app ? t(`mailhub.apps.${app.id}.name`) : '';
  return (
    <BottomSheet open={!!app} onClose={onClose} title={t('mailhub.off.title', { app: name })} testID="mailhub-off-dialog">
      <View style={styles.form}>
        <Text size="sm" muted>
          {app ? t(`mailhub.off.body.${app.kind}`) : ''}
        </Text>
        {app?.kind === 'contacts' ? (
          <View style={styles.row}>
            <Checkbox
              checked={removeData}
              onCheckedChange={(v) => setRemoveData(v === true)}
              accessibilityLabel={t('mailhub.off.removeContacts')}
              testID="mailhub-off-remove"
            />
            <Text size="sm" style={styles.fill}>
              {t('mailhub.off.removeContacts')}
            </Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Button variant="outline" onPress={onClose}>
            {t('mailhub.actions.keepOn')}
          </Button>
          <Button variant="destructive" disabled={busy} onPress={() => onConfirm(removeData)} testID="mailhub-off-confirm">
            {t('mailhub.actions.turnOff')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  content: { paddingTop: 12 },
  panel: { gap: 16 },
  kind: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', padding: 4 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  emoji: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  form: { gap: 12 },
});
