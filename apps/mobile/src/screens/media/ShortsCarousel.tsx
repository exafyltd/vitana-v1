/**
 * VTID-05677 — native twin of `MobileShortsCarousel.tsx`: the list of short
 * cards (thumbnail, title, description or "by <creator>", creator, a play mark)
 * that opens the full-screen feed at the tapped index; an owner kebab with
 * edit / delete on the member's own shorts; the "No Shorts" empty state.
 * (The web scale / opacity emphasis of the visible card and the per-card scroll
 * snap are decoration of the web scroller and are not ported.)
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, PressableRow, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Film, Pencil, Play, Trash2 } from '../../ports/media-ui';
import { EmptyState, ON_MEDIA } from './components';
import { MoreVerticalButton } from './KebabButton';
import { thumbnailSource, type VideoShort } from './model';

export function ShortsCarousel({ shorts, currentUserId, onShortClick, onEdit, onDelete }: { shorts: VideoShort[]; currentUserId?: string; onShortClick: (index: number) => void; onEdit?: (short: VideoShort) => void; onDelete?: (short: VideoShort) => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [menuFor, setMenuFor] = useState<number | null>(null);

  if (shorts.length === 0) {
    return <EmptyState testID="media-shorts-empty" icon={<Film size={32} color={colors.mutedForeground} />} title={t('screens.community.noShorts')} hint={t('screens.community.checkBackSoonForNewShorts')} />;
  }

  return (
    <View accessibilityLabel={t('screens.community.shortsFeed')} style={styles.list} testID="media-shorts-list">
      {shorts.map((short, index) => {
        const source = thumbnailSource(short);
        const owner = !!currentUserId && short.user_id === currentUserId && !!(onEdit || onDelete);
        return (
          <View key={short.id ?? index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`media-short-${short.id ?? index}`}>
            <Pressable
              onPress={() => onShortClick(index)}
              accessibilityRole="button"
              accessibilityLabel={t('mediaHubNative.a11y.shortCard', { index: index + 1, total: shorts.length, title: short.title })}
              testID={`media-short-open-${index}`}
              style={StyleSheet.absoluteFill}
            >
              {source ? <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
              <View style={styles.playMark} pointerEvents="none">
                <View style={[styles.playBadge, { backgroundColor: ON_MEDIA.scrim }]}>
                  <Play size={28} color={ON_MEDIA.glyph} />
                </View>
              </View>
              <View style={[styles.caption, { backgroundColor: ON_MEDIA.scrimStrong }]} pointerEvents="none">
                <Text weight="600" numberOfLines={2} style={{ color: ON_MEDIA.glyph }}>
                  {short.title}
                </Text>
                <Text size="sm" numberOfLines={2} style={{ color: ON_MEDIA.glyphMuted }}>
                  {short.description || t('mediaHubNative.by', { name: short.creator })}
                </Text>
                <View style={styles.author}>
                  <Avatar uri={short.creatorAvatar} fallback={short.creator.slice(0, 1).toUpperCase()} size={24} />
                  <Text size="xs" numberOfLines={1} style={{ color: ON_MEDIA.glyph }}>
                    {short.creator}
                  </Text>
                </View>
              </View>
            </Pressable>
            {owner ? (
              <View style={styles.kebab}>
                <MoreVerticalButton onPress={() => setMenuFor(menuFor === index ? null : index)} label={t('mediaHubNative.a11y.moreActions')} testID={`media-short-kebab-${index}`} tone="surface" />
                {menuFor === index ? (
                  <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]} testID="media-short-menu">
                    {onEdit ? (
                      <PressableRow
                        onPress={() => {
                          setMenuFor(null);
                          onEdit(short);
                        }}
                        accessibilityLabel={t('screens.community.editDetails')}
                        accessibilityRole="button"
                        testID={`media-short-edit-${index}`}
                        style={styles.menuItem}
                      >
                        <Pencil size={16} color={colors.foreground} />
                        <Text>{t('screens.community.editDetails')}</Text>
                      </PressableRow>
                    ) : null}
                    {onDelete ? (
                      <PressableRow
                        onPress={() => {
                          setMenuFor(null);
                          onDelete(short);
                        }}
                        accessibilityLabel={t('screens.community.delete')}
                        accessibilityRole="button"
                        testID={`media-short-delete-${index}`}
                        style={styles.menuItem}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                        <Text style={{ color: colors.destructive }}>{t('screens.community.delete')}</Text>
                      </PressableRow>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingHorizontal: 16, paddingBottom: 96 },
  card: { height: 460, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  playMark: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', start: 0, end: 0, bottom: 0, padding: 16, gap: 4 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kebab: { position: 'absolute', top: 12, end: 12, alignItems: 'flex-end' },
  menu: { marginTop: 4, borderRadius: 8, borderWidth: 1, paddingVertical: 4, minWidth: 160 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
});
