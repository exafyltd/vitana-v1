/**
 * VTID-05461 — twin of `src/components/AutopilotPopup.tsx` (717), the
 * Autopilot recommendations popup on its mobile branch (fullscreen responsive
 * dialog), backed by the native `useAutopilot` (hooks/useAutopilot.ts):
 *  - opening fetches the list when the AI-data consent is given, else opens
 *    the consent dialog (closing it without consent closes the popup);
 *  - loading / error (Try again) / generating / empty (copy per generate
 *    reason, "check for new") states; an empty queue regenerates once per open;
 *  - the Index-lift strip, actions grouped by dominant pillar (headers only
 *    with ≥2 groups, most under-served first), each row: checkbox / executing
 *    dot / done check, emoji, title, Complete (executing), Done badge, time and
 *    priority badges, "Later" (snooze 24 h → toast), pillar delta badges;
 *  - Go (n) runs the selection — drafted suggestions are reviewed first in the
 *    draft sheet (AutopilotDraftSheet.tsx) — then follows a navigate result
 *    (`?open=` overlay targets go to the overlay bus and complete the row) or
 *    shows the done banner; Not now; "See all in AI" → /dashboard/actions.
 * Selection, the client-dismissed set and snooze state persist through the
 * hook (native key-value store, see useAutopilot.ts).
 *
 * Also as the web: Complete with a reward toasts "+N VTNA earned!" (:340-343;
 * the web literal is a catalog key here, `journeyAutopilotNative.autopilot.vtnaEarned`);
 * a reviewed Media Hub caption is copied to the clipboard (:263-265, React
 * Native's `Clipboard`); the error state's detail line (:520) names the
 * failure through the catalog (HTTP status / server / connection) instead of
 * printing the raw message.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Clipboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Spinner, Text, useUITheme } from '../../ports/ui';
import {
  alpha,
  ButtonIcon,
  Checkbox,
  JourneyIcon,
  notifyError,
  notifySuccess,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Separator,
  Textarea,
  type AutopilotAction,
  type AutopilotPriority,
  type ContributionVector,
  type VitanaPillarKey,
} from '../../ports/journey';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { useAutopilot, type AutopilotLoadError } from './hooks/useAutopilot';
import { useAIConsent } from './hooks/useAIConsent';
import { useVitanaIndex } from './data/supabase';

const PILLAR_LABEL_KEY: Record<VitanaPillarKey, string> = {
  nutrition: 'screens.common.nutrition',
  hydration: 'screens.common.hydration',
  exercise: 'screens.common.exercise',
  sleep: 'screens.common.sleep',
  mental: 'screens.common.mental',
};
const PILLAR_EMOJI: Record<VitanaPillarKey, string> = { nutrition: '🥗', hydration: '💧', exercise: '💪', sleep: '😴', mental: '🧠' };
const PILLAR_ORDER: VitanaPillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];

export function dominantPillar(vector: ContributionVector | null | undefined): VitanaPillarKey | null {
  if (!vector) return null;
  let bestKey: VitanaPillarKey | null = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === 'number' && v > bestVal) {
      bestKey = k;
      bestVal = v;
    }
  }
  return bestKey;
}

export function sumVectorTotal(vector: ContributionVector | null | undefined): number {
  if (!vector) return 0;
  return Object.values(vector).reduce<number>((acc, v) => acc + (typeof v === 'number' && v > 0 ? v : 0), 0);
}

/** `?open=` targets that are overlays, not routes (AutopilotPopup.tsx:289-294). */
export function overlayEventFor(target: string): string | null {
  try {
    const parsed = new URL(target, 'https://app.invalid');
    const open = parsed.searchParams.get('open');
    if (open === 'life_compass' || open === 'goals') return 'vitana:open-life-compass';
    if (open === 'calendar') return 'calendar:open';
    if (open === 'invite' || open === 'referral') return 'referral:open';
    if (open === 'index' || open === 'vitana_index') return 'vitana:open-index';
    return null;
  } catch {
    return null;
  }
}

/** web PillarDeltaBadges (compact): positive contributions, largest first. */
function PillarDeltaBadges({ vector }: { vector: ContributionVector }) {
  const { t } = useI18n();
  const entries = (Object.entries(vector) as Array<[VitanaPillarKey, number]>)
    .filter(([p, v]) => PILLAR_ORDER.includes(p) && typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <View style={styles.deltas} accessibilityLabel={t('screens.health.vitanaIndexPillarImpact')} testID="autopilot-pillar-deltas">
      {entries.map(([p, v]) => (
        <Badge key={p} variant="outline">
          {`${t(`vitanaIndex.${p}`)} +${v}`}
        </Badge>
      ))}
    </View>
  );
}

/** web AIDataConsentDialog — every line from the journeyAutopilotNative catalog (the web passes English fallbacks). */
function AIDataConsentDialog({ open, onOpenChange, onConsent }: { open: boolean; onOpenChange: (o: boolean) => void; onConsent: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const item = (icon: string, key: string) => (
    <View style={styles.consentRow} key={key}>
      <JourneyIcon name={icon} size={16} color={colors.mutedForeground} />
      <Text size="sm" muted style={styles.flex}>
        {t(`journeyAutopilotNative.consent.${key}`)}
      </Text>
    </View>
  );
  const check = (key: string) => (
    <View style={styles.consentRow} key={key}>
      <JourneyIcon name="CheckCircle" size={16} color={colors.primary} />
      <Text size="sm" style={styles.flex}>
        {t(`journeyAutopilotNative.consent.${key}`)}
      </Text>
    </View>
  );
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent testID="ai-consent-dialog">
        <ResponsiveDialogHeader>
          <View style={styles.titleRow}>
            <JourneyIcon name="Shield" size={20} color={colors.destructive} />
            <ResponsiveDialogTitle>{t('journeyAutopilotNative.consent.title')}</ResponsiveDialogTitle>
          </View>
          <ResponsiveDialogDescription>{t('journeyAutopilotNative.consent.subtitle')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <Text size="sm" weight="600">
            {t('journeyAutopilotNative.consent.whatIsSent')}
          </Text>
          {item('Mic', 'voiceData')}
          {item('BookOpen', 'diaryData')}
          {item('Brain', 'memoryData')}
          {item('User', 'profileData')}
          {item('Share2', 'socialData')}
          <View style={[styles.alert, { borderColor: colors.border }]}>
            <JourneyIcon name="Heart" size={16} />
            <Text size="sm" style={styles.flex}>
              <Text size="sm" weight="600">
                {t('journeyAutopilotNative.consent.recipientLabel')}
              </Text>{' '}
              {t('journeyAutopilotNative.consent.recipient')}
            </Text>
          </View>
          <Text size="sm" weight="600">
            {t('journeyAutopilotNative.consent.purposeLabel')}
          </Text>
          {item('Target', 'purpose')}
          {check('notStored')}
          {check('revokeAnytime')}
          {check('gdprCompliant')}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Text size="xs" muted style={styles.center}>
            {t('journeyAutopilotNative.consent.agreementFooter')}
          </Text>
          <View style={styles.footerRow}>
            <Button variant="outline" onPress={() => onOpenChange(false)} testID="ai-consent-not-now">
              {t('journeyAutopilotNative.consent.notNow')}
            </Button>
            <Button onPress={onConsent} testID="ai-consent-agree">
              {t('journeyAutopilotNative.consent.iAgree')}
            </Button>
          </View>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export interface DraftSheetItem {
  id: string;
  title: string;
  kind: string;
}
const TITLE_KEY: Record<string, string> = { post_to_feed: 'autopilot.draft.titlePost', send_chat_message: 'autopilot.draft.titleMessage', media_upload: 'autopilot.draft.titleCaption' };
const CONFIRM_KEY: Record<string, string> = { post_to_feed: 'autopilot.draft.confirmPost', send_chat_message: 'autopilot.draft.confirmMessage', media_upload: 'autopilot.draft.confirmCaption' };

/** web AutopilotDraftSheet (VTID-04504): review / edit / regenerate a drafted text before the run. */
function AutopilotDraftSheet({
  item,
  loadDraft,
  onConfirm,
  onSkip,
}: {
  item: DraftSheetItem | null;
  loadDraft: (id: string, opts?: { regenerate?: boolean }) => Promise<{ ok: boolean; draft?: string } | null>;
  onConfirm: (id: string, text: string) => void;
  onSkip: (id: string) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = async (regenerate = false) => {
    if (!item) return;
    setLoading(true);
    setFailed(false);
    const r = await loadDraft(item.id, { regenerate });
    if (r?.ok && r.draft) setText(r.draft);
    else setFailed(true);
    setLoading(false);
  };
  useEffect(() => {
    setText('');
    if (item) void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);
  if (!item) return null;
  const trimmed = text.trim();
  return (
    <ResponsiveDialog open onOpenChange={(o) => (o ? undefined : onSkip(item.id))}>
      <ResponsiveDialogContent testID="autopilot-draft">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(TITLE_KEY[item.kind] ?? 'autopilot.draft.titlePost')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{item.title}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <Text size="sm" muted>
            {t('autopilot.draft.hint')}
          </Text>
          {loading ? (
            <View style={styles.inline}>
              <Spinner accessibilityLabel={t('autopilot.draft.loading')} />
              <Text size="sm" muted>
                {t('autopilot.draft.loading')}
              </Text>
            </View>
          ) : (
            <Textarea value={text} onChangeText={setText} placeholder={t('autopilot.draft.placeholder')} rows={6} testID="autopilot-draft-text" />
          )}
          {failed && !loading ? (
            <Text size="xs" muted>
              {t('autopilot.draft.failed')}
            </Text>
          ) : null}
          <Button variant="ghost" size="sm" onPress={() => void load(true)} disabled={loading} testID="autopilot-draft-regenerate">
            <ButtonIcon name="RefreshCw" size={14} />
            {t('autopilot.draft.regenerate')}
          </Button>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <View style={styles.footerRow}>
            <Button variant="outline" style={styles.flex} onPress={() => onSkip(item.id)} testID="autopilot-draft-skip">
              {t('autopilot.draft.skip')}
            </Button>
            <Button style={styles.flex} disabled={loading || (item.kind !== 'media_upload' && !trimmed)} onPress={() => onConfirm(item.id, trimmed)} testID="autopilot-draft-confirm">
              {t(CONFIRM_KEY[item.kind] ?? 'autopilot.draft.confirmPost')}
            </Button>
          </View>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function AutopilotPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const ap = useAutopilot();
  const {
    allVisibleActions,
    pendingActions,
    selectedActions,
    executeActions,
    toggleActionSelection,
    isExecuting,
    loading,
    error,
    fetchRecommendations,
    completeRecommendation,
    setActionStatus,
    markDismissedLocally,
    snoozeRecommendation,
    fetchDraft,
    generateRecommendations,
    generating,
    generateReason,
    fetchedOnce,
  } = ap;
  const { hasConsent, dialogOpen: consentOpen, setDialogOpen: setConsentOpen, grantConsent } = useAIConsent();
  const { index } = useVitanaIndex();
  const currentTotal = index?.total ?? null;
  const pillarScores = index?.pillars ?? null;
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [draftQueue, setDraftQueue] = useState<DraftSheetItem[]>([]);
  const [pendingRun, setPendingRun] = useState<{ ids: string[]; drafts: Record<string, string> } | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const autoGenAttempted = useRef(false);

  const selectedLift = selectedActions.reduce((acc, a) => acc + sumVectorTotal(a.contributionVector), 0);
  const grouped = (() => {
    const groups = new Map<VitanaPillarKey | '_unassigned', AutopilotAction[]>();
    for (const a of allVisibleActions) {
      const key = dominantPillar(a.contributionVector) ?? '_unassigned';
      if (!groups.has(key)) groups.set(key, []);
      (groups.get(key) as AutopilotAction[]).push(a);
    }
    const ordered = Array.from(groups.entries())
      .filter(([k]) => k !== '_unassigned')
      .sort(([a], [b]) => (pillarScores?.[a as VitanaPillarKey] ?? 0) - (pillarScores?.[b as VitanaPillarKey] ?? 0)) as Array<[VitanaPillarKey | '_unassigned', AutopilotAction[]]>;
    const unassigned = groups.get('_unassigned');
    if (unassigned && unassigned.length > 0) ordered.push(['_unassigned', unassigned]);
    return ordered;
  })();
  const showGroupHeaders = grouped.length >= 2;

  useEffect(() => {
    if (open && hasConsent) void fetchRecommendations();
    else if (open && !hasConsent) setConsentOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasConsent, fetchRecommendations]);

  useEffect(() => {
    if (open) autoGenAttempted.current = false;
  }, [open]);

  useEffect(() => {
    if (!open || !hasConsent || loading || generating || !fetchedOnce) return undefined;
    if (allVisibleActions.length > 0) {
      autoGenAttempted.current = false;
      return undefined;
    }
    if (autoGenAttempted.current) return undefined;
    if (generateReason && generateReason !== 'cooldown') return undefined;
    autoGenAttempted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const result = await generateRecommendations();
      if (result?.reason === 'cooldown') timer = setTimeout(() => void fetchRecommendations(), 1500);
    })();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, hasConsent, loading, generating, fetchedOnce, allVisibleActions.length, generateReason, generateRecommendations, fetchRecommendations]);

  useEffect(() => {
    if (!open) {
      setShowBanner(false);
      setBannerMessage(null);
    }
  }, [open]);

  const runSelected = async (ids: string[], drafts: Record<string, string>) => {
    const results = await executeActions(ids, drafts);
    const nav = results.find((r) => r.success && r.action_type === 'navigate' && r.target);
    if (nav && nav.target) {
      onOpenChange(false);
      const overlay = overlayEventFor(nav.target);
      if (overlay) {
        overlayBus.emit(overlay);
        completeRecommendation(nav.actionId).catch(() => undefined);
        return;
      }
      navigateToWebPath(nav.target);
      return;
    }
    const notified = results.find((r) => r.success && r.completion_message);
    if (notified) setBannerMessage(notified.completion_message as string);
    setShowBanner(true);
  };

  const handleExecute = async () => {
    if (selectedActions.length === 0) return;
    const drafted = selectedActions.filter((a) => a.draftKind).map((a) => ({ id: a.id, title: a.title, kind: a.draftKind as string }));
    if (drafted.length > 0) {
      setPendingRun({ ids: selectedActions.map((a) => a.id), drafts: {} });
      setDraftQueue(drafted);
      return;
    }
    await runSelected(selectedActions.map((a) => a.id), {});
  };
  const advanceDrafts = (run: { ids: string[]; drafts: Record<string, string> }) => {
    const rest = draftQueue.slice(1);
    setDraftQueue(rest);
    if (rest.length === 0) {
      setPendingRun(null);
      if (run.ids.length > 0) void runSelected(run.ids, run.drafts);
    } else setPendingRun(run);
  };
  const handleDraftConfirm = (id: string, text: string) => {
    if (!pendingRun) return;
    // Media Hub has no caption prefill yet; the reviewed caption is copied.
    const item = draftQueue.find((d) => d.id === id);
    if (item?.kind === 'media_upload' && text) {
      try {
        Clipboard.setString(text);
      } catch {
        /* no clipboard — the run goes on */
      }
    }
    advanceDrafts({ ids: pendingRun.ids, drafts: { ...pendingRun.drafts, [id]: text } });
  };
  const handleDraftSkip = (id: string) => {
    if (!pendingRun) return;
    advanceDrafts({ ids: pendingRun.ids.filter((x) => x !== id), drafts: pendingRun.drafts });
  };

  const handleComplete = async (id: string) => {
    markDismissedLocally(id);
    setActionStatus(id, 'completed');
    setCompletingId(id);
    try {
      const json = await completeRecommendation(id);
      if (json?.ok && json.via === 'complete' && json.reward) notifySuccess('journeyAutopilotNative.autopilot.vtnaEarned', undefined, { reward: json.reward });
      void fetchRecommendations();
    } finally {
      setCompletingId(null);
    }
  };
  const handleSnooze = async (id: string) => {
    setSnoozingId(id);
    try {
      const ok = await snoozeRecommendation(id, 24);
      if (ok) {
        if (selectedActions.some((a) => a.id === id)) toggleActionSelection(id);
        notifySuccess('screens.autopilotpopup.snoozedUntilTomorrow');
      } else notifyError('screens.autopilotpopup.snoozeFailed');
    } finally {
      setSnoozingId(null);
    }
  };

  const priorityTone = (p: AutopilotPriority) => (p === 'high' ? colors.statusError : p === 'medium' ? colors.statusWarning : colors.statusSuccess);
  const priorityIcon = (p: AutopilotPriority) => (p === 'high' ? 'AlertTriangle' : p === 'medium' ? 'Info' : 'CheckCircle');

  const actionItem = (a: AutopilotAction) => {
    const isCompleted = a.status === 'completed';
    const isProcessing = a.status === 'executing';
    const isPending = a.status === 'pending';
    return (
      <Pressable
        key={a.id}
        testID={`autopilot-action-${a.id}`}
        accessibilityRole={isPending ? 'checkbox' : undefined}
        accessibilityState={isPending ? { checked: !!a.selected } : undefined}
        onPress={() => isPending && toggleActionSelection(a.id)}
        style={[
          styles.action,
          { backgroundColor: colors.card, borderColor: colors.border },
          isCompleted ? { borderColor: alpha(colors.statusSuccess, 0.4), backgroundColor: alpha(colors.statusSuccessSubtle, 0.5) } : null,
          isProcessing ? { borderColor: alpha(colors.primary, 0.3), backgroundColor: alpha(colors.primary, 0.05) } : null,
        ]}
      >
        <View style={styles.actionLead}>
          {isPending ? <Checkbox checked={!!a.selected} onCheckedChange={() => toggleActionSelection(a.id)} testID={`autopilot-check-${a.id}`} /> : null}
          {isProcessing ? <JourneyIcon name="CircleDot" size={16} color={colors.primary} /> : null}
          {isCompleted ? <JourneyIcon name="Check" size={16} color={colors.statusSuccess} /> : null}
        </View>
        <Text size="2xl">{a.icon}</Text>
        <View style={styles.flex}>
          <View style={styles.actionTop}>
            <Text size="sm" weight="500" color={isCompleted ? colors.statusSuccess : undefined} style={styles.flex}>
              {a.title}
            </Text>
            <View style={styles.inline}>
              {isProcessing ? (
                <Button size="xs" disabled={completingId === a.id} onPress={() => void handleComplete(a.id)} testID={`autopilot-complete-${a.id}`}>
                  {completingId === a.id ? <Spinner accessibilityLabel={t('common.loading')} /> : t('screens.common.complete')}
                </Button>
              ) : null}
              {isCompleted ? <Badge variant="success">{t('screens.common.erledigt')}</Badge> : null}
              {isPending && a.timeEstimate ? <Badge variant="outline">{a.timeEstimate}</Badge> : null}
              {isPending ? (
                <View style={[styles.priority, { borderColor: alpha(priorityTone(a.priority), 0.4), backgroundColor: alpha(priorityTone(a.priority), 0.08) }]} testID={`autopilot-priority-${a.id}`}>
                  <JourneyIcon name={priorityIcon(a.priority)} size={12} color={priorityTone(a.priority)} />
                  <Text size="xs" color={priorityTone(a.priority)}>
                    {t(`autopilot.priorities.${a.priority}`)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text size="xs" muted>
            {a.reason}
          </Text>
          {isPending ? (
            <View style={styles.snoozeRow}>
              <Button
                size="xs"
                variant="ghost"
                accessibilityLabel={t('screens.autopilotpopup.snoozeLater')}
                disabled={snoozingId === a.id}
                onPress={() => void handleSnooze(a.id)}
                testID={`autopilot-snooze-${a.id}`}
              >
                <ButtonIcon name="Clock" size={12} />
                {t('screens.autopilotpopup.snoozeLater')}
              </Button>
            </View>
          ) : null}
          {a.contributionVector ? <PillarDeltaBadges vector={a.contributionVector} /> : null}
        </View>
      </Pressable>
    );
  };

  const center = (children: ReactElement | ReactElement[], testID: string) => (
    <View style={styles.state} testID={testID}>
      {children}
    </View>
  );

  const errorDetail = (e: AutopilotLoadError | null): string => {
    if (e?.kind === 'status') return t('journeyAutopilotNative.autopilot.errorStatus', { status: e.status });
    if (e?.kind === 'server') return t('journeyAutopilotNative.autopilot.errorServer');
    return t('journeyAutopilotNative.autopilot.errorNetwork');
  };

  const content = (() => {
    if (loading)
      return center(
        [<Spinner key="s" accessibilityLabel={t('screens.common.loadingRecommendations')} />, <Text key="t" size="sm" muted>{t('screens.common.loadingRecommendations')}</Text>],
        'autopilot-loading',
      );
    if (error)
      return center(
        [
          <JourneyIcon key="i" name="WifiOff" size={40} color={colors.destructive} />,
          <Text key="t" size="sm" weight="500">{t('screens.common.couldNotLoadRecommendations')}</Text>,
          <Text key="d" size="xs" muted style={styles.center} testID="autopilot-error-detail">
            {errorDetail(error)}
          </Text>,
          <Button key="b" size="sm" variant="outline" onPress={() => void fetchRecommendations()} testID="autopilot-retry">
            {t('screens.common.tryAgain')}
          </Button>,
        ],
        'autopilot-error',
      );
    if (generating)
      return center([<Spinner key="s" accessibilityLabel={t('screens.autopilotpopup.preparingNextSteps')} />, <Text key="t" size="sm" weight="500">{t('screens.autopilotpopup.preparingNextSteps')}</Text>], 'autopilot-generating');
    if (allVisibleActions.length === 0) {
      const headline = generateReason === 'daily_cap' ? t('screens.autopilotpopup.allCaughtUpForToday') : t('screens.common.allCaughtUp');
      const sub = generateReason === 'no_signals' ? t('screens.autopilotpopup.nothingNewRightNow') : t('screens.common.noNewRecommendationsRightNowCheck');
      const showRefresh = generateReason !== 'disabled' && generateReason !== 'daily_cap';
      return center(
        [
          <JourneyIcon key="i" name="PartyPopper" size={40} color={colors.primary} />,
          <Text key="h" size="sm" weight="500">{headline}</Text>,
          <Text key="s" size="xs" muted style={styles.center}>{sub}</Text>,
          ...(showRefresh
            ? [
                <Button key="b" size="sm" variant="outline" onPress={() => void generateRecommendations()} testID="autopilot-check-new">
                  {t('screens.autopilotpopup.checkForNew')}
                </Button>,
              ]
            : []),
        ],
        'autopilot-empty',
      );
    }
    return (
      <>
        <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
          {showBanner ? (
            <View style={[styles.banner, { borderColor: alpha(colors.primary, 0.2), backgroundColor: alpha(colors.primary, 0.08) }]} testID="autopilot-banner">
              <View style={[styles.bannerIcon, { backgroundColor: alpha(colors.primary, 0.2) }]}>
                <JourneyIcon name="Check" size={24} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text size="lg" weight="700">
                  {t('screens.common.erledigt2')}
                </Text>
                <Text size="sm" muted>
                  {bannerMessage || t('screens.autopilotpopup.allSelectedTasksCompleted')}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.lift, { backgroundColor: alpha(colors.primary, 0.08) }]} testID="autopilot-lift">
            <Text size="sm" style={styles.flex}>
              {currentTotal !== null ? (
                <>
                  {`${t('screens.common.now')} `}
                  <Text size="sm" weight="700">
                    {String(currentTotal)}
                  </Text>
                  {selectedLift > 0 ? (
                    <>
                      {t('screens.common.value0AfterGoValue1', { value0: ' ', value1: ' ' })}
                      <Text size="sm" weight="600" color={colors.statusSuccess}>
                        {String(currentTotal + selectedLift)}
                      </Text>
                    </>
                  ) : null}
                </>
              ) : (
                t('screens.autopilotpopup.indexLoading')
              )}
            </Text>
            {selectedLift > 0 ? (
              <Text size="xs" weight="600" color={colors.statusSuccess}>{`+${selectedLift}`}</Text>
            ) : (
              <Text size="xs" muted>
                {t('empty.autopilotPopupZero')}
              </Text>
            )}
          </View>
          {grouped.map(([key, acts], idx) => (
            <View key={key} style={styles.group}>
              {showGroupHeaders ? (
                <Text size="xs" weight="600" muted style={idx === 0 ? undefined : styles.groupGap} testID={`autopilot-group-${key}`}>
                  {key === '_unassigned' ? `✨ ${t('screens.common.other').toUpperCase()}` : `${PILLAR_EMOJI[key]} ${t(PILLAR_LABEL_KEY[key]).toUpperCase()}`}
                </Text>
              ) : null}
              {acts.map(actionItem)}
            </View>
          ))}
        </ScrollView>
        <Separator />
        <ResponsiveDialogFooter>
          <Button onPress={() => void handleExecute()} disabled={selectedActions.length === 0 || isExecuting} testID="autopilot-go">
            {isExecuting ? <Spinner accessibilityLabel={t('common.loading')} /> : <ButtonIcon name="Zap" />}
            {t('screens.common.goLength', { length: selectedActions.length })}
          </Button>
          <Button variant="outline" onPress={() => onOpenChange(false)} testID="autopilot-not-now">
            {t('autopilot.popup.notNow')}
          </Button>
          <Button
            variant="link"
            onPress={() => {
              onOpenChange(false);
              navigateToWebPath('/dashboard/actions');
            }}
            testID="autopilot-see-all"
          >
            {t('autopilot.popup.seeAllInAI')}
          </Button>
        </ResponsiveDialogFooter>
      </>
    );
  })();

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent fullscreenOnMobile testID="autopilot-popup">
          <ResponsiveDialogHeader>
            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, { backgroundColor: alpha(colors.statusError, 0.15) }]}>
                <JourneyIcon name="Plane" size={16} color={colors.statusError} />
              </View>
              <ResponsiveDialogTitle>{t('autopilot.popup.title')}</ResponsiveDialogTitle>
              {!loading && pendingActions.length > 0 ? <Badge variant="outline" testID="autopilot-selection">{`${selectedActions.length} / ${pendingActions.length}`}</Badge> : null}
            </View>
            <ResponsiveDialogDescription>
              {loading
                ? t('screens.autopilotpopup.checkingForNewSuggestions')
                : pendingActions.length > 0
                  ? t('screens.autopilotpopup.selectedSuggestionsCount', { count: selectedActions.length })
                  : t('screens.autopilotpopup.yourAutopilotRecommendations')}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {content}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <AIDataConsentDialog
        open={consentOpen}
        onOpenChange={(o) => {
          setConsentOpen(o);
          if (!o && !hasConsent) onOpenChange(false);
        }}
        onConsent={grantConsent}
      />
      <AutopilotDraftSheet item={draftQueue[0] ?? null} loadDraft={(id, o) => fetchDraft(id, o ?? {})} onConfirm={handleDraftConfirm} onSkip={handleDraftSkip} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  state: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  list: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, borderWidth: 1, padding: 20 },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  lift: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  group: { gap: 8 },
  groupGap: { marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  actionLead: { marginTop: 4, minWidth: 16 },
  actionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  priority: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  snoozeRow: { flexDirection: 'row', marginTop: 4 },
  deltas: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 8, padding: 12 },
  footerRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
