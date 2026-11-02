/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — twin of the web
 * `src/components/diary/DiaryEntryList.tsx` (+ `DateGroupHeader`,
 * `PhotoEntryCard`, `PhotoCarouselModal`): the member's entries grouped by day
 * (Today / Yesterday / This week / a date), five at first and ten more per
 * "Load more"; photo entries as a card with the first photo (and "+N"), voice
 * and text entries with their source badge, duration, time ago, text and
 * tags; delete behind a confirmation (removes the entry's `diary-photos`
 * objects, then the entry). Loading skeletons, an empty card, and — natively
 * — an error notice with retry (the web list shows the empty card on error).
 * The photo viewer pages through the entry's photos; "Download" hands the
 * photo url to the system share sheet (program §4: system sheets).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { FlatList, Image, Pressable, Share, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Badge, Button, Skeleton, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  ButtonIcon,
  Dialog,
  DialogContent,
  DialogTitle,
  DiaryIcon,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from '../../ports/diary';
import { deleteDiaryEntry, photoUrls, useDiaryEntries, useInvalidateDiary, type DiaryEntry } from './data/entries';
import { removeDiaryPhotos } from './data/storage';
import { DiaryCard } from './components';
import { useDiaryText, type DiaryText } from './text';

const SOURCE_ICON: Record<string, string> = { voice: 'Mic', photo: 'Image', text: 'Type' };

function badgeLabel(t: DiaryText['t'], source?: string | null): string {
  switch (source) {
    case 'voice':
      return t('screens.diary.voiceRecording');
    case 'photo':
      return t('screens.diary.photo');
    case 'text':
      return t('screens.diary.textEntry');
    default:
      return t('screens.diary.entry');
  }
}

type Viewer = { images: string[]; caption: string; tags: string[]; createdAt: string };

function PhotoViewer({ viewer, onClose }: { viewer: Viewer | null; onClose: () => void }) {
  const x = useDiaryText();
  const { t } = x;
  const { colors } = useUITheme();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const pageWidth = Math.min(width - 48, 900);
  const images = viewer?.images ?? [];
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.max(0, Math.min(images.length - 1, Math.round(e.nativeEvent.contentOffset.x / pageWidth))));
  return (
    <Dialog
      open={!!viewer}
      onOpenChange={(open) => {
        if (!open) {
          setIndex(0);
          onClose();
        }
      }}
    >
      <DialogContent testID="diary-photo-viewer" style={styles.viewer}>
        <DialogTitle style={styles.hidden}>{t('screens.diary.photoPreview')}</DialogTitle>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(u, i) => `${u}-${i}`}
          style={{ width: pageWidth }}
          renderItem={({ item, index: i }) => (
            <Image source={{ uri: item }} resizeMode="contain" style={{ width: pageWidth, height: Math.round(height * 0.55) }} accessibilityLabel={`${t('screens.diary.photo')} ${i + 1}`} />
          )}
        />
        <View style={styles.viewerBar}>
          <View style={styles.viewerMeta}>
            {images.length > 1 ? (
              <Text variant="caption" muted testID="diary-photo-viewer-count">
                {`${x.fmtNumber(index + 1)} / ${x.fmtNumber(images.length)}`}
              </Text>
            ) : null}
            {viewer?.createdAt ? (
              <Text variant="caption" muted>
                {x.timeAgo(viewer.createdAt)}
              </Text>
            ) : null}
          </View>
          <Button variant="ghost" size="sm" testID="diary-photo-viewer-download" onPress={() => void Share.share({ url: images[index], message: images[index] }).catch(() => undefined)}>
            <ButtonIcon name="Download" />
            {t('screens.diary.download')}
          </Button>
        </View>
        {viewer?.caption ? <Text style={{ color: colors.foreground }}>{viewer.caption}</Text> : null}
        {viewer?.tags.length ? (
          <View style={styles.tags}>
            {viewer.tags.map((tag, i) => (
              <Badge key={`${tag}-${i}`} variant="secondary">
                {x.tagLabel(tag)}
              </Badge>
            ))}
          </View>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ onPress }: { onPress: () => void }) {
  const { t } = useDiaryText();
  const { colors } = useUITheme();
  return (
    <Pressable testID="diary-entry-delete" accessibilityRole="button" accessibilityLabel={t('screens.diary.deleteEntry')} onPress={onPress} hitSlop={8} style={styles.iconBtn}>
      <DiaryIcon name="Trash2" size={14} color={colors.mutedForeground} />
    </Pressable>
  );
}

function PhotoEntryCard({ entry, onOpen, onDelete }: { entry: DiaryEntry; onOpen: () => void; onDelete: () => void }) {
  const x = useDiaryText();
  const { t } = x;
  const { colors } = useUITheme();
  const urls = photoUrls(entry);
  const tags = entry.tags ?? [];
  // Entries saved without a caption carry the legacy English default; show the translated label.
  const text = entry.text === 'Photo entry' ? t('screens.diary.photoEntry') : entry.text;
  return (
    <DiaryCard testID="diary-entry" style={styles.photoCard}>
      <View style={styles.fill}>
        {text ? (
          <Text weight="600" numberOfLines={2}>
            {text}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text variant="caption" muted style={styles.fill}>
            {x.timeAgo(entry.created_at)}
          </Text>
          <DeleteButton onPress={onDelete} />
        </View>
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.slice(0, 3).map((tag, i) => (
              <Badge key={`${tag}-${i}`} variant="secondary">
                {x.tagLabel(tag)}
              </Badge>
            ))}
            {tags.length > 3 ? <Badge variant="outline">{`+${tags.length - 3}`}</Badge> : null}
          </View>
        ) : null}
      </View>
      <Pressable testID="diary-entry-photo" accessibilityRole="imagebutton" accessibilityLabel={t('screens.diary.photoEntry')} onPress={onOpen} style={styles.photoThumb}>
        <Image source={{ uri: urls[0] }} style={styles.photoImg} />
        {urls.length > 1 ? (
          <View style={[styles.more, { backgroundColor: colors.foreground }]}>
            <Text variant="label" color={colors.background}>{`+${urls.length - 1}`}</Text>
          </View>
        ) : null}
      </Pressable>
    </DiaryCard>
  );
}

function EntryCard({ entry, onDelete }: { entry: DiaryEntry; onDelete: () => void }) {
  const x = useDiaryText();
  const { colors } = useUITheme();
  const tags = entry.tags ?? [];
  return (
    <DiaryCard testID="diary-entry" style={styles.entryCard}>
      <View style={[styles.sourceIcon, { backgroundColor: colors.muted }]}>
        <DiaryIcon name={SOURCE_ICON[entry.source ?? ''] ?? 'Mic'} size={20} color={colors.primary} />
      </View>
      <View style={styles.fill}>
        <View style={styles.metaRow}>
          <Badge variant="secondary">{badgeLabel(x.t, entry.source)}</Badge>
          {entry.duration ? <Badge variant="outline">{`${x.fmtNumber(Math.round(entry.duration))}s`}</Badge> : null}
          <Text variant="caption" muted style={styles.timeAgo}>
            {x.timeAgo(entry.created_at)}
          </Text>
          <DeleteButton onPress={onDelete} />
        </View>
        <Text style={styles.entryText}>{entry.text}</Text>
        {tags.length > 0 ? (
          <View style={styles.tags}>
            <DiaryIcon name="Tag" size={12} color={colors.mutedForeground} />
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </View>
        ) : null}
      </View>
    </DiaryCard>
  );
}

export function DiaryEntryList(): ReactElement {
  const x = useDiaryText();
  const { t } = x;
  const { colors } = useUITheme();
  const { data: entries, isLoading, isError, refetch } = useDiaryEntries();
  const invalidate = useInvalidateDiary();
  const [displayCount, setDisplayCount] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const visible = useMemo(() => (entries ?? []).slice(0, displayCount), [entries, displayCount]);
  const groups = useMemo(() => {
    const map = new Map<number, DiaryEntry[]>();
    for (const e of visible) {
      const d = new Date(e.created_at);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => b - a);
  }, [visible]);

  const onDelete = async () => {
    const id = deleteTarget;
    if (!id) return;
    setDeleting(true);
    try {
      const entry = entries?.find((e) => e.id === id);
      if (entry) await removeDiaryPhotos(photoUrls(entry));
      await deleteDiaryEntry(id);
      invalidate();
      notify('toasts.diary.entryDeleted', 'toasts.diary.diaryEntryHasRemoved');
    } catch {
      notifyError('toasts.diary.error', 'toasts.diary.failedDeleteEntryPleaseTryAgain');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.list} testID="diary-entries-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  if (isError && !entries) {
    return (
      <DiaryCard testID="diary-entries-error" style={styles.center}>
        <Text muted>{t('diaryNative.entriesLoadError')}</Text>
        <Button variant="outline" size="sm" testID="diary-entries-retry" onPress={() => void refetch()}>
          {t('screens.diary.retry')}
        </Button>
      </DiaryCard>
    );
  }

  if (visible.length === 0) {
    return (
      <DiaryCard testID="diary-entries-empty" style={styles.center}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <DiaryIcon name="Mic" size={20} color={colors.primary} />
        </View>
        <Text muted style={styles.centerText}>
          {t('screens.diary.noValue0EntriesYet', { value0: '' })}
        </Text>
        <Text variant="caption" muted style={styles.centerText}>
          {t('screens.diary.startRecordingYourWellnessJourney')}
        </Text>
      </DiaryCard>
    );
  }

  const total = entries?.length ?? 0;
  return (
    <View testID="diary-entries" style={styles.groups}>
      {groups.map(([day, list]) => (
        <View key={day} testID="diary-date-group">
          <View style={styles.groupHeader}>
            <Text weight="600" size="sm" accessibilityRole="header">
              {x.dateGroupLabel(new Date(day))}
            </Text>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.list}>
            {list.map((entry) => {
              const urls = photoUrls(entry);
              return entry.source === 'photo' && urls.length > 0 ? (
                <PhotoEntryCard
                  key={entry.id}
                  entry={entry}
                  onOpen={() => setViewer({ images: urls, caption: entry.text, tags: entry.tags ?? [], createdAt: entry.created_at })}
                  onDelete={() => setDeleteTarget(entry.id)}
                />
              ) : (
                <EntryCard key={entry.id} entry={entry} onDelete={() => setDeleteTarget(entry.id)} />
              );
            })}
          </View>
        </View>
      ))}

      {total > displayCount ? (
        <View style={styles.loadMore}>
          <Button variant="secondary" size="sm" testID="diary-entries-more" onPress={() => setDisplayCount((n) => n + 10)}>
            {t('screens.diary.loadMoreValue0Remaining', { value0: x.fmtNumber(total - displayCount) })}
          </Button>
        </View>
      ) : null}

      <PhotoViewer viewer={viewer} onClose={() => setViewer(null)} />

      <ResponsiveConfirmDialog open={!!deleteTarget} onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}>
        <ResponsiveConfirmDialogContent testID="diary-delete-dialog">
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.diary.deleteEntry')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>{t('screens.diary.thisDiaryEntryWillPermanentlyDeleted')}</ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel disabled={deleting} testID="diary-delete-cancel">
              {t('screens.diary.cancel')}
            </ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction variant="destructive" disabled={deleting} testID="diary-delete-confirm" onPress={() => void onDelete()}>
              {deleting ? t('screens.diary.deleting') : t('screens.diary.delete')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 24 },
  list: { gap: 12 },
  skeleton: { height: 128, borderRadius: 16 },
  center: { alignItems: 'center', paddingVertical: 24 },
  centerText: { textAlign: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupHeader: { paddingVertical: 12, marginBottom: 4 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 8 },
  fill: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timeAgo: { marginStart: 'auto' },
  iconBtn: { padding: 6, borderRadius: 999 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  entryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 16 },
  sourceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  entryText: { marginVertical: 8 },
  photoCard: { flexDirection: 'row', gap: 16, padding: 16 },
  photoThumb: { width: 80, height: 80 },
  photoImg: { width: 80, height: 80, borderRadius: 8 },
  more: { position: 'absolute', bottom: 4, end: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, opacity: 0.85 },
  loadMore: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  viewer: { gap: 12, alignItems: 'stretch' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  viewerMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hidden: { height: 0, opacity: 0 },
});
