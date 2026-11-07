/**
 * VTID-05510 — small shared Discover pieces, native twins of:
 *  - `ProductImage` (src/components/discover/ProductImage.tsx): the product
 *    photo, or the category-aware icon placeholder when there is none (or the
 *    legacy chat mock image);
 *  - `AffiliateDisclosure` (AffiliateDisclosure.tsx): compact line or the
 *    info row above a top border;
 *  - the five-star rating row the sub-catalogue cards draw;
 *  - `openExternal`: the web `<a target="_blank">` (affiliate redirect,
 *    evidence links) opens in the system browser.
 */
import type { ReactElement, ReactNode } from 'react';
import { Image, Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, useToneColor, type DiscoverTone } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';

const LEGACY_MOCK = /lovable-uploads\/7cca32ae-be17-4ab2-bc65-98257922207a/;

/** pickFallback: the placeholder glyph and tint for a category / subcategory. */
export function pickFallback(category?: string | null, subcategory?: string | null): { icon: string; tone: DiscoverTone } {
  const key = (subcategory || category || '').toLowerCase();
  if (/herb|adaptogen|botanical/.test(key)) return { icon: 'Leaf', tone: 'category-6' };
  if (/oil|omega|tincture|liquid|drop/.test(key)) return { icon: 'Droplet', tone: 'category-5' };
  if (/beauty|skin|collagen/.test(key)) return { icon: 'Flower2', tone: 'category-4' };
  if (/vitamin|mineral|multivitamin/.test(key)) return { icon: 'Sparkles', tone: 'category-7' };
  if (/stack|blend|bundle/.test(key)) return { icon: 'Package', tone: 'category-2' };
  return { icon: 'Pill', tone: 'category-3' };
}

export function ProductImage({
  src,
  alt,
  category,
  subcategory,
  style,
  testID,
}: {
  src?: string | null;
  alt: string;
  category?: string | null;
  subcategory?: string | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const { icon, tone } = pickFallback(category, subcategory);
  const tint = useToneColor(tone);
  const hasImage = !!src && !LEGACY_MOCK.test(src);
  if (hasImage) {
    return (
      <View style={[styles.image, { backgroundColor: colors.card }, style]} testID={testID ?? 'product-image'}>
        <Image source={{ uri: src as string }} accessibilityLabel={alt} resizeMode="contain" style={styles.fill} />
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={alt} style={[styles.image, styles.center, { backgroundColor: alpha(tint, 0.15) }, style]} testID={testID ?? 'product-image-fallback'}>
      <DiscoverIcon name={icon} size={40} color={tint} />
    </View>
  );
}

export function AffiliateDisclosure({ compact = false, style }: { compact?: boolean; style?: StyleProp<ViewStyle> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  if (compact) {
    return (
      <Text size="xs" muted style={[styles.compactDisclosure, style as never]} testID="affiliate-disclosure">
        {t('screens.discover.vitanaMayEarnCommissionFromPurchases')}
      </Text>
    );
  }
  return (
    <View style={[styles.disclosure, { borderTopColor: colors.border }, style]} testID="affiliate-disclosure">
      <DiscoverIcon name="Info" size={14} color={colors.mutedForeground} />
      <Text size="xs" muted style={styles.flex}>
        {t('screens.discover.vitanaMayEarnCommissionFromPurchases2')}
      </Text>
    </View>
  );
}

/** Five stars, the first ⌊rating⌋ filled (the sub-catalogue cards). */
export function StarRow({ rating, size = 16, children }: { rating: number; size?: number; children?: ReactNode }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.row}>
      <View style={styles.row}>
        {Array.from({ length: 5 }).map((_, i) => {
          const on = i < Math.floor(rating || 0);
          return <DiscoverIcon key={i} name="Star" size={size} color={on ? colors.statusWarning : colors.mutedForeground} fill={on ? colors.statusWarning : colors.mutedForeground} />;
        })}
      </View>
      {children}
    </View>
  );
}

/** web `fmtNumber` (src/lib/locale-format.ts): Intl in the member's language. */
export function useFmtNumber(): (n: number | null | undefined, opts?: Intl.NumberFormatOptions) => string {
  const { language } = useI18n();
  return (n, opts) => {
    try {
      return new Intl.NumberFormat(language, opts).format(n ?? 0);
    } catch {
      return String(n ?? 0);
    }
  };
}

/** web `<a href target="_blank">`: the system browser. */
export function openExternal(url: string): void {
  if (!url) return;
  void Linking.openURL(url).catch(() => undefined);
}

/** A small rounded label (the web `Badge` / inline pill spans). */
export function Pill({ children, color, background, style, testID }: { children: ReactNode; color: string; background: string; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  return (
    <View style={[styles.pill, { backgroundColor: background }, style]} testID={testID}>
      {typeof children === 'string' ? (
        <Text size="xs" weight="600" color={color}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
  compactDisclosure: { fontSize: 10, lineHeight: 15 },
  disclosure: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: 1, paddingTop: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
});
