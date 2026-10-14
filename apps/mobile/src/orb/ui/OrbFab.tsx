/**
 * VTID-05182 — the ORB button in the centre of N3's bottom bar (native N6d,
 * plan Change 15; registered in N3's ORB slot, `src/ports/orb-slot.tsx`).
 *
 * A 56 pt circle with the widget FAB's gradient and its 4 s glow pulse
 * (`.vtorb-fab`, orb-widget.js:551-564, mobile size :742). The accessible
 * name is the existing `orbHint.tapToTalk` key. Tapping opens the overlay;
 * the permission flow and the session live in the controller.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import type { OrbSlotProps } from '../../ports/orb-slot';
import { useI18n } from '../../i18n/I18nProvider';
import { useOrbSession } from './OrbProvider';
import { FAB_PULSE_MS, FAB_SIZE, SPHERE_GRADIENT } from './orb-ui-state';

export function OrbFab({ bottomNavVisible, hiddenBySheet }: OrbSlotProps) {
  const { t } = useI18n();
  const { controller, state } = useOrbSession();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: FAB_PULSE_MS / 2, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0, duration: FAB_PULSE_MS / 2, useNativeDriver: true }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [glow]);

  if (!bottomNavVisible || hiddenBySheet || !controller) {
    return <View testID="orb-fab-hidden" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.slot} />;
  }

  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] });
  const haloScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.slot}>
      <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Pressable
        testID="orb-fab"
        accessibilityRole="button"
        accessibilityLabel={t('orbHint.tapToTalk')}
        accessibilityState={{ expanded: state.open }}
        onPress={() => void controller.open()}
        style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
      >
        <View style={styles.highlight} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: FAB_SIZE, height: FAB_SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: 'rgba(90,110,150,0.45)',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    experimental_backgroundImage: SPHERE_GRADIENT,
    backgroundColor: '#5a6a8a',
    boxShadow: '0 4px 24px rgba(90,110,150,0.5)',
  },
  highlight: {
    position: 'absolute',
    top: '15%',
    start: '20%',
    width: '40%',
    height: '30%',
    borderRadius: FAB_SIZE,
    backgroundColor: 'rgba(200,210,230,0.25)',
  },
});
