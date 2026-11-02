/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — `/memory/permissions`
 * (MEMORY.PERMISSIONS), body-port of the web `src/pages/memory/Permissions.tsx`:
 * the 🔒 header, `LearningSwitches.tsx` (one saved switch per life area, the
 * five pillars first, app usage last; disabled while the prefs are
 * unavailable) and `UsageDataCard.tsx` (count, JSON export, delete all behind
 * a confirmation). The web export downloads a `.json` file; the native app
 * hands the same JSON to the system share sheet (program §4: system sheets).
 */
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Button, Text, notifyError, useUITheme } from '../../ports/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  MemoryIcon,
  Switch,
  notifySuccess,
  useMemoryPalette,
} from '../../ports/memory';
import { CardSkeleton, MemoryCard, MemoryScaffold } from './components';
import { useMemoryText } from './text';
import { exportUsageData, LIFE_CATEGORIES, PILLAR_CATEGORIES, useDeleteUsageData, useLearningPrefs, useSetLearningPref, useUsageData, type LearnableCategory } from './data/learning';
import { PILLAR_ICON } from './timeline/parts';

const isPillarCategory = (c: LearnableCategory): c is (typeof PILLAR_CATEGORIES)[number] => (PILLAR_CATEGORIES as readonly string[]).includes(c);

function LearningSwitches() {
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  const palette = useMemoryPalette();
  const { data, isLoading, isError } = useLearningPrefs();
  const set = useSetLearningPref();
  if (isLoading) return <CardSkeleton height={320} />;
  const learn = new Map((data?.prefs ?? []).map((p) => [p.category, p.learn]));
  const disabled = isError || !data?.available;
  const label = (c: LearnableCategory) => (isPillarCategory(c) ? x.pillarLabel(c) : t(`timeline.category.${c}`));

  const row = (c: LearnableCategory, hint?: string, first = false) => {
    const on = learn.get(c) ?? true;
    return (
      <View key={c} style={[styles.switchRow, first ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
        <View style={styles.fill}>
          <View style={styles.switchLabel}>
            {isPillarCategory(c) ? <MemoryIcon name={PILLAR_ICON[c]} size={16} color={palette.pillar[c].accent} /> : null}
            <Text weight="600">{label(c)}</Text>
          </View>
          {hint ? (
            <Text variant="caption" muted>
              {hint}
            </Text>
          ) : null}
        </View>
        <Switch
          checked={on}
          disabled={disabled}
          accessibilityLabel={label(c)}
          testID={`learn-switch-${c}`}
          onCheckedChange={(v) => set.mutate({ category: c, learn: v }, { onError: () => notifyError('memoryLearning.toast.saveFailed') })}
        />
      </View>
    );
  };

  return (
    <MemoryCard testID="memory-learning-switches" title={t('memoryLearning.switches.title')}>
      <Text muted>{t('memoryLearning.switches.description')}</Text>
      {disabled ? (
        <Text muted testID="memory-learning-unavailable">
          {t('memoryLearning.switches.unavailable')}
        </Text>
      ) : null}
      <View style={styles.section}>
        <Text variant="label" muted accessibilityRole="header">
          {t('memoryLearning.switches.pillarsTitle')}
        </Text>
        {PILLAR_CATEGORIES.map((c, i) => row(c, undefined, i === 0))}
        <View style={styles.note}>
          <MemoryIcon name="ShieldCheck" size={14} color={colors.mutedForeground} />
          <Text variant="caption" muted style={styles.fill}>
            {t('memoryLearning.switches.healthNote')}
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="label" muted accessibilityRole="header">
          {t('memoryLearning.switches.lifeTitle')}
        </Text>
        {LIFE_CATEGORIES.map((c, i) => row(c, undefined, i === 0))}
      </View>
      <View style={styles.section}>
        <Text variant="label" muted accessibilityRole="header">
          {t('memoryLearning.switches.appUsageTitle')}
        </Text>
        {row('app_usage', `${t('memoryLearning.switches.appUsageDescription')} ${t('memoryLearning.switches.appUsageOff')}`, true)}
      </View>
    </MemoryCard>
  );
}

function UsageDataCard() {
  const x = useMemoryText();
  const { t } = x;
  const { data, isLoading } = useUsageData();
  const del = useDeleteUsageData();
  const [confirm, setConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  if (isLoading) return <CardSkeleton />;
  const available = !!data?.available && typeof data.count === 'number';

  const onExport = async () => {
    setExporting(true);
    try {
      const json = await exportUsageData();
      await Share.share({ message: json, title: t('memoryNative.usage.shareTitle') });
    } catch {
      notifyError('memoryLearning.toast.saveFailed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <MemoryCard
      testID="memory-usage-data"
      title={t('memoryLearning.usage.title')}
      actions={
        <>
          <Button variant="outline" size="sm" disabled={!available || exporting} onPress={() => void onExport()} testID="memory-usage-export">
            {t('memoryLearning.usage.export')}
          </Button>
          <Button variant="ghost" size="sm" disabled={!available || del.isPending} onPress={() => setConfirm(true)} testID="memory-usage-delete">
            {t('memoryLearning.usage.delete')}
          </Button>
        </>
      }
    >
      <Text muted>{t('memoryLearning.usage.description')}</Text>
      <Text weight="600" testID="memory-usage-count">
        {available ? t('memoryLearning.usage.count', { n: x.fmtNumber(data!.count as number) }) : t('memoryLearning.usage.countUnavailable')}
      </Text>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent testID="memory-usage-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('memoryLearning.usage.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('memoryLearning.usage.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('memoryLearning.usage.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              testID="memory-usage-delete-confirm"
              onPress={() =>
                del.mutate(undefined, {
                  onSuccess: () => notifySuccess('memoryLearning.toast.deleted'),
                  onError: () => notifyError('memoryLearning.toast.saveFailed'),
                })
              }
            >
              {t('memoryLearning.usage.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MemoryCard>
  );
}

export function MemoryPermissions() {
  const { t } = useMemoryText();
  return (
    <MemoryScaffold
      active="permissions"
      title={t('memoryLearning.header.permissionsTitle')}
      description={t('memoryLearning.header.permissionsDescription')}
      emoji="🔒"
      testID="screen-memory-permissions"
    >
      <View style={styles.body} testID="memory-permissions">
        <LearningSwitches />
        <UsageDataCard />
      </View>
    </MemoryScaffold>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  section: { gap: 4, marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 10 },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
});
