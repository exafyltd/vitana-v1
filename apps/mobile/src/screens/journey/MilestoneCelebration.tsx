/**
 * VTID-05461 — twin of `src/components/MilestoneCelebration.tsx` for the
 * milestone My Journey raises (`daily_goal`, celebrate.ts): listens for
 * `vitana-milestone` on the overlay bus and opens the centred dialog — the
 * milestone icon (🎉), title, body and Continue (MilestoneCelebration.tsx:88-125;
 * `daily_goal` has no reward line and no invite CTA, :37) — with the confetti
 * burst (`celebrateSuccess({ type: "reward_earned" })`) when the event asks
 * for it (reduced motion and the 5-min throttle are decided in celebrate.ts).
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, useToneColor } from '../../ports/journey';
import { useBusEvent } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { MILESTONE_EVENT, type MilestoneDetail } from './celebrate';

const MILESTONE_ICON: Record<string, string> = { daily_goal: '🎉' };
const PIECES = 36;
const CONFETTI_MS = 2200;

function Confetti(): ReactElement {
  const { width, height } = useWindowDimensions();
  const { colors } = useUITheme();
  const palette = [useToneColor('category-2'), useToneColor('category-4'), useToneColor('category-7'), colors.statusWarning, colors.statusSuccess];
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: ((i * 37) % 100) / 100,
        drift: (((i * 53) % 21) - 10) * 6,
        delay: ((i * 29) % 30) / 100,
        spin: (i % 2 ? 1 : -1) * (180 + ((i * 41) % 360)),
        size: 6 + (i % 4) * 2,
      })),
    [],
  );
  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration: CONFETTI_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [progress]);
  return (
    // Inside the dialog's panel (the dialog is a native Modal, nothing outside it draws on top), spread over the screen.
    <View pointerEvents="none" style={[styles.confetti, { top: -height / 2, height, start: -16, width }]} testID="journey-confetti">
      {pieces.map((p, i) => {
        const local = progress.interpolate({ inputRange: [0, p.delay, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              start: p.x * width,
              width: p.size,
              height: p.size * 1.6,
              borderRadius: 2,
              backgroundColor: palette[i % palette.length],
              opacity: local.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [-20, height * 0.8] }) },
                { translateX: local.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

export function MilestoneCelebration(): ReactElement | null {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MilestoneDetail | null>(null);
  const [burst, setBurst] = useState(0);
  useBusEvent<MilestoneDetail>(MILESTONE_EVENT, (d) => {
    if (!d) return;
    setDetail(d);
    setOpen(true);
    if (d.confetti) setBurst((n) => n + 1);
  });
  useEffect(() => {
    if (!burst) return undefined;
    const id = setTimeout(() => setBurst(0), CONFETTI_MS + 200);
    return () => clearTimeout(id);
  }, [burst]);
  if (!detail) return null;
  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent testID="journey-milestone">
          <DialogHeader>
            <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {MILESTONE_ICON[detail.milestone] ?? '🏅'}
            </Text>
            <DialogTitle style={styles.center}>{t(detail.titleKey)}</DialogTitle>
            <DialogDescription style={styles.center}>{t(detail.bodyKey)}</DialogDescription>
          </DialogHeader>
          <Button
            testID="journey-milestone-continue"
            onPress={() => {
              setOpen(false);
              if (detail.url) navigateToWebPath(detail.url);
            }}
          >
            {t('screens.common.continue')}
          </Button>
          {burst ? <Confetti key={burst} /> : null}
        </DialogContent>
      </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 60, lineHeight: 72, textAlign: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  confetti: { position: 'absolute' },
});
