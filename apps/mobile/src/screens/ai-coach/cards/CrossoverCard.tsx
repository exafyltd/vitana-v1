/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — twin of the web
 * `src/components/crossover/CrossoverCard.tsx` (md: `min-h-72`): the 56 px
 * category icon tile (accent /10 fill, /20 border, accent glyph — `.icon-<category>`),
 * bold title + muted subtitle, the content, then the full-width category CTA
 * (accent /10 fill, /20 border) and the optional outline secondary button.
 * The card's border takes the category accent at /10 (`.card-<category>`).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { CoachIcon, useCoachPalette, type CoachCategory } from '../../../ports/ai-coach';

export type CrossoverCardProps = {
  icon: string;
  category: CoachCategory;
  title: string;
  subtitle: string;
  content?: ReactNode;
  buttonText: string;
  onButtonClick: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  testID?: string;
};

export function CrossoverCard({ icon, category, title, subtitle, content, buttonText, onButtonClick, secondaryButtonText, onSecondaryButtonClick, testID }: CrossoverCardProps) {
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const accent = p.category[category];
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.background, borderColor: p.alpha(accent, 0.1) }]}>
      <View style={styles.header}>
        <View style={[styles.tile, { backgroundColor: p.alpha(accent, 0.1), borderColor: p.alpha(accent, 0.2) }]}>
          <CoachIcon name={icon} size={20} color={accent} />
        </View>
        <View style={styles.titles}>
          <Text weight="700" accessibilityRole="header">
            {title}
          </Text>
          <Text size="xs" muted>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        {content ? <View style={styles.content}>{content}</View> : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onButtonClick}
            style={({ pressed }) => [styles.cta, { backgroundColor: p.alpha(accent, 0.1), borderColor: p.alpha(accent, 0.2), opacity: pressed ? 0.8 : 1 }]}
            testID={testID ? `${testID}-cta` : undefined}
          >
            <Text size="sm" weight="600" color={colors.foreground}>
              {buttonText}
            </Text>
          </Pressable>
          {secondaryButtonText && onSecondaryButtonClick ? (
            <Button variant="outline" size="sm" onPress={onSecondaryButtonClick} style={styles.secondary} testID={testID ? `${testID}-secondary` : undefined}>
              {secondaryButtonText}
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 288, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  header: { padding: 24, paddingBottom: 12, gap: 12 },
  tile: { width: 56, height: 56, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titles: { gap: 4 },
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between' },
  content: { flex: 1, marginBottom: 16 },
  actions: { gap: 8 },
  cta: { height: 36, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondary: { alignSelf: 'stretch' },
});
