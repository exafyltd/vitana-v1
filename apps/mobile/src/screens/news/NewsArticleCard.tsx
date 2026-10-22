/**
 * VTID-05298 (Native Wave 2, news lane) — native twin of the web
 * `src/components/crossover/NewsArticleCard.tsx` (the mobile-web branch).
 *
 * The single owner of the news-feed card: Home's native feed renders it too
 * (design decision 3). Presentational only — the parent passes `onPress`,
 * exactly as the web card takes `onClick`. A fixed 16:9 cover image (primary
 * with a fallback swap on load error, the same as the web's `currentSrc` /
 * `handleImageError`), category · timestamp, a 2-line title, a 2-line
 * description and a source row. React 19: typed with `ReactElement`.
 *
 * Web→native prop map (apps/mobile/README.md): `onClick`→`onPress`,
 * `className`→`style`, `<img>`→RN `Image`, shadcn `Card`→a token-styled
 * `View`. The web kebab menu (`NewsArticleCardMenu`) is share/save/hide — not
 * part of the reader port; it is omitted here and lands with its own surface,
 * so the card stays a pure, dependency-light twin.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';

export type NewsArticleCardProps = {
  title: string;
  description?: string;
  imageUrl: string;
  /** Shown when the primary image fails to load (og:image blocked/broken). */
  fallbackImageUrl?: string;
  category?: string;
  timestamp?: string;
  sourceName?: string;
  sourceAvatarUrl?: string | null;
  onPress?: () => void;
  testID?: string;
};

export function NewsArticleCard({
  title,
  description,
  imageUrl,
  fallbackImageUrl,
  category,
  timestamp,
  sourceName,
  sourceAvatarUrl,
  onPress,
  testID,
}: NewsArticleCardProps): ReactElement {
  const { colors } = useUITheme();
  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  // Reset the image state when the primary URL changes (a different article).
  useEffect(() => {
    setCurrentSrc(imageUrl);
    setHasFallenBack(false);
  }, [imageUrl]);

  const handleImageError = () => {
    if (!hasFallenBack && fallbackImageUrl && fallbackImageUrl !== imageUrl) {
      setHasFallenBack(true);
      setCurrentSrc(fallbackImageUrl);
    }
  };

  const avatarLetter = (sourceName || '•').trim().charAt(0).toUpperCase();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg },
        pressed ? styles.pressed : null,
      ]}
    >
      {/* Cover — fixed 16:9 so every card is symmetric. */}
      <View style={[styles.media, { backgroundColor: colors.muted }]}>
        {currentSrc ? (
          <Image
            testID={testID ? `${testID}-image` : undefined}
            source={{ uri: currentSrc }}
            onError={handleImageError}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View style={styles.body}>
        {category || timestamp ? (
          <View style={styles.metaRow}>
            {category ? (
              <Text variant="label" style={[styles.category, { color: colors.primary }]}>
                {category}
              </Text>
            ) : null}
            {category && timestamp ? <Text variant="caption" muted>•</Text> : null}
            {timestamp ? (
              <Text variant="caption" muted>
                {timestamp}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text weight="700" numberOfLines={2} style={styles.title}>
          {title}
        </Text>

        {description ? (
          <Text variant="body" muted numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Avatar uri={sourceAvatarUrl ?? undefined} fallback={avatarLetter} size={28} />
          {sourceName ? (
            <Text variant="body" numberOfLines={1} style={styles.source}>
              {sourceName}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  media: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: 16, paddingTop: 12, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  category: { textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 16, lineHeight: 22 },
  description: { lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  source: { flexShrink: 1, opacity: 0.8 },
});
