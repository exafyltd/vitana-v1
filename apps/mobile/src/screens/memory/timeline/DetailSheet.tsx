/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — one moment, native twin
 * of the web `TimelineDetailSheet.tsx` phone branch (bottom sheet): what
 * happened and when, its effect on the Vitana Index (before → after per
 * pillar, only when measured), the sensitive-data note, the "Vitana may learn
 * from this" switch (hide from AI), Open and Delete behind a confirmation.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Skeleton, Text, notifyError, useUITheme } from '../../../ports/ui';
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
} from '../../../ports/memory';
import { navigateToWebPath } from '../../../navigation/navigate';
import { CATEGORY_LINK, useMemoryText } from '../text';
import { PILLAR_KEYS, useTimelineActions, useTimelineItem } from '../data/timeline';

export function TimelineDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  const palette = useMemoryPalette();
  const { data, isLoading, isError } = useTimelineItem(id);
  const { hide, remove } = useTimelineActions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = data?.item;
  const detail = data?.detail;
  const link = item ? CATEGORY_LINK[item.category] : undefined;
  const measured = item?.influence?.kind === 'measured';
  const changed = PILLAR_KEYS.filter((p) => (item?.influence?.delta_pillars?.[p] ?? 0) !== 0);

  return (
    <BottomSheet open={!!id} onClose={onClose} title={item ? x.momentTitle(item) : t('timeline.detail.loading')} testID="timeline-detail">
      {item ? (
        <Text muted>{[x.fmtDate(item.at, { dateStyle: 'medium', timeStyle: 'short' }), ...x.momentFacts(item)].join(' · ')}</Text>
      ) : null}
      {isLoading ? (
        <View style={styles.gap}>
          <Skeleton style={styles.skeletonLine} />
          <Skeleton style={[styles.skeletonLine, styles.skeletonShort]} />
        </View>
      ) : null}
      {isError ? (
        <Text muted testID="timeline-detail-error">
          {t('timeline.detail.error')}
        </Text>
      ) : null}

      {item && detail ? (
        <View style={styles.body}>
          <View style={styles.gap}>
            <Text weight="600">{t('timeline.detail.indexTitle')}</Text>
            {measured && changed.length > 0 ? (
              <View style={styles.gap} testID="timeline-detail-measured">
                {changed.map((p) => {
                  const before = Number(detail.index_before?.[p] ?? 0);
                  const after = Number(detail.index_after?.[p] ?? 0);
                  return (
                    <View key={p} style={[styles.measured, { backgroundColor: palette.pillar[p].tint }]}>
                      <Text>{x.pillarLabel(p)}</Text>
                      <Text>{t('timeline.detail.beforeAfter', { before: x.fmtNumber(before), after: x.fmtNumber(after), delta: x.signed(after - before) })}</Text>
                    </View>
                  );
                })}
              </View>
            ) : item.influence?.kind === 'counted' && item.influence.pillar ? (
              <Text muted>{t('timeline.detail.counted', { pillar: x.pillarLabel(item.influence.pillar) })}</Text>
            ) : (
              <Text muted>{t('timeline.detail.noInfluence')}</Text>
            )}
          </View>

          {item.sensitivity === 'special_category' ? (
            <View style={styles.note}>
              <MemoryIcon name="ShieldCheck" size={16} color={colors.mutedForeground} />
              <Text muted style={styles.fill}>
                {t('timeline.detail.sensitive')}
              </Text>
            </View>
          ) : null}

          <View style={styles.learn}>
            <View style={styles.fill}>
              <Text weight="600">{t('timeline.detail.learnTitle')}</Text>
              <Text muted>{t(item.hidden_from_ai ? 'timeline.detail.learnOff' : 'timeline.detail.learnOn')}</Text>
            </View>
            <Switch
              checked={!item.hidden_from_ai}
              disabled={hide.isPending}
              accessibilityLabel={t('timeline.detail.learnTitle')}
              testID="timeline-learn-switch"
              onCheckedChange={(on) => hide.mutate({ id: item.id, hidden: !on }, { onError: () => notifyError('timeline.toast.hideFailed') })}
            />
          </View>

          <View style={styles.actions}>
            {link ? (
              <Button variant="outline" size="sm" onPress={() => navigateToWebPath(link)} testID="timeline-open">
                {t('timeline.detail.open')}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onPress={() => setConfirmDelete(true)} testID="timeline-delete">
              {t('timeline.detail.delete')}
            </Button>
          </View>
        </View>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent testID="timeline-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('timeline.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('timeline.delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('timeline.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              testID="timeline-delete-confirm"
              onPress={() =>
                item &&
                remove.mutate(item.id, {
                  onSuccess: () => {
                    notifySuccess('timeline.toast.deleted');
                    onClose();
                  },
                  onError: () => notifyError('timeline.toast.deleteFailed'),
                })
              }
            >
              {t('timeline.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  gap: { gap: 6 },
  skeletonLine: { height: 16, borderRadius: 4 },
  skeletonShort: { width: '66%' },
  measured: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  learn: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  fill: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
