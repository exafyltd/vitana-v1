/**
 * VTID-05510 — twins of the two card-corner controls:
 *  - `BookmarkButton` (src/components/bookmarks/BookmarkButton.tsx): top-end
 *    corner, toggles the `bookmarked_items` row (useBookmarks), a short bounce
 *    while it saves, filled warning star-yellow when bookmarked;
 *  - `RecommendButton` (src/components/discover/RecommendButton.tsx): the
 *    "Recommend & Earn" control — `badge` (top-start icon circle) or `cta`
 *    (green pill); a press silently records the recommendation
 *    (`POST /discover/recommendations`, success / failure toast), then shows
 *    the recommended state; a recommended product is a no-op.
 */
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, notifyError, notifySuccess } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { useBookmarks, type BookmarkButtonItem } from './data/bookmarks';
import { createProductRecommendation, useMyRecommendations } from './data/marketplace';

export function BookmarkButton({ item, size = 40, style }: { item: BookmarkButtonItem; size?: number; style?: StyleProp<ViewStyle> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bounce = useRef(new Animated.Value(0)).current;
  const bookmarked = isBookmarked(item.item_type, item.item_id);
  const onPress = async () => {
    Animated.sequence([
      Animated.timing(bounce, { toValue: -6, duration: 150, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    await toggleBookmark(item);
  };
  return (
    <Animated.View style={[styles.cornerEnd, { transform: [{ translateY: bounce }] }]}>
      <Pressable
        testID={`bookmark-${item.item_type}-${item.item_id}`}
        accessibilityRole="button"
        accessibilityLabel={bookmarked ? t('discoverCommerceNative.bookmark.remove') : t('discoverCommerceNative.bookmark.add')}
        accessibilityState={{ selected: bookmarked }}
        onPress={() => void onPress()}
        style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(colors.card, 0.7) }, style]}
      >
        <DiscoverIcon
          name="Bookmark"
          size={size >= 36 ? 20 : 14}
          color={bookmarked ? colors.statusWarning : colors.primaryForeground}
          fill={bookmarked ? colors.statusWarning : 'none'}
        />
      </Pressable>
    </Animated.View>
  );
}

/** web `useRecommendProduct`. */
export function useRecommendProduct(productId: string) {
  const [isRecommending, setIsRecommending] = useState(false);
  const qc = useQueryClient();
  const { data } = useMyRecommendations();
  const isRecommended = (data?.items ?? []).some((it) => it.product_id === productId);
  const recommendProduct = useCallback(async () => {
    if (isRecommended) return;
    setIsRecommending(true);
    try {
      await createProductRecommendation(productId);
      notifySuccess('discover.recommendAdded');
      await qc.invalidateQueries({ queryKey: ['my-recommendations'] });
    } catch {
      notifyError('discover.recommendFailed');
    } finally {
      setIsRecommending(false);
    }
  }, [productId, isRecommended, qc]);
  return { recommendProduct, isRecommending, isRecommended };
}

export function RecommendButton({ productId, variant = 'badge', size = 40, style }: { productId: string; variant?: 'badge' | 'cta'; size?: number; style?: StyleProp<ViewStyle> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { recommendProduct, isRecommending, isRecommended } = useRecommendProduct(productId);
  const disabled = isRecommending || isRecommended;
  const label = t(isRecommended ? 'discover.alreadyRecommended' : 'discover.recommendProduct');

  if (variant === 'cta') {
    const ctaLabel = isRecommended ? t('discover.alreadyRecommended') : t('discover.recommendAndEarn');
    return (
      <Pressable
        testID={`recommend-cta-${productId}`}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        accessibilityState={{ disabled, selected: isRecommended }}
        disabled={disabled}
        onPress={() => void recommendProduct()}
        style={[
          styles.cta,
          isRecommended ? { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess } : { backgroundColor: colors.card, borderColor: colors.statusSuccess },
          isRecommending ? { opacity: 0.7 } : null,
          style,
        ]}
      >
        <View style={styles.ctaLead}>
          <View style={[styles.ctaStar, { backgroundColor: isRecommended ? alpha(colors.card, 0.2) : colors.statusSuccessSubtle }]}>
            <DiscoverIcon name="Star" size={14} color={isRecommended ? colors.primaryForeground : colors.statusSuccess} fill={isRecommended ? colors.primaryForeground : colors.statusSuccess} />
          </View>
          <Text size="sm" weight="500" color={isRecommended ? colors.primaryForeground : colors.statusSuccess} numberOfLines={1}>
            {ctaLabel}
          </Text>
        </View>
        <DiscoverIcon name={isRecommended ? 'Check' : 'ChevronRight'} size={20} color={isRecommended ? colors.primaryForeground : colors.statusSuccess} />
      </Pressable>
    );
  }

  return (
    <View style={styles.cornerStart}>
      <Pressable
        testID={`recommend-${productId}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: isRecommended }}
        disabled={disabled}
        onPress={() => void recommendProduct()}
        style={[
          styles.icon,
          { width: size, height: size, borderRadius: size / 2, borderWidth: 1 },
          isRecommended ? { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess } : { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.border, 0.5) },
          style,
        ]}
      >
        <View style={isRecommending ? { opacity: 0.5 } : null}>
          <DiscoverIcon name="BadgeCheck" size={size >= 36 ? 16 : 12} color={colors.primaryForeground} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerEnd: { position: 'absolute', top: 4, end: 4, zIndex: 10 },
  cornerStart: { position: 'absolute', top: 4, start: 4, zIndex: 10 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 2, borderRadius: 999, height: 36, paddingHorizontal: 12 },
  ctaLead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  ctaStar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
