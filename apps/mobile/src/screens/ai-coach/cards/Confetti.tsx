/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the big-lift confetti of
 * the web `celebrateSuccess({ type: 'reward_earned' })` (src/lib/confetti.ts:
 * 27-56 config, 59-196 canvas particles), drawn with react-native `Animated`.
 * Each particle runs the web physics (start velocity 45 × 0.5-1, spread 90°,
 * decay 0.94, gravity 0.3, 200 ticks, alpha life/200) once up front; the
 * sampled path drives one shared progress value on the native driver. The
 * web's three raw purples are the purple `--domain-discover-accent` token at
 * three opacities. Decorative: hidden from accessibility, never takes touches.
 */
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { Animated, StyleSheet, useWindowDimensions } from "react-native";
import { useCoachPalette } from "../../../ports/ai-coach";

/** confetti.ts:34-40 (reward_earned) and the Particle defaults (confetti.ts:149-158). */
const PARTICLES = 150;
const SPREAD_DEG = 90;
const START_VELOCITY = 45;
const DECAY = 0.94;
const GRAVITY = 0.3;
const TICKS = 200;
const SCALAR = 1.5;
/** The web animates on requestAnimationFrame: 200 ticks at 60 fps. */
const DURATION_MS = Math.round((TICKS / 60) * 1000);
const SAMPLES = [0, 5, 10, 20, 40, 70, 100, 140, 200];

type Particle = {
  xs: number[];
  ys: number[];
  size: number;
  color: string;
  circle: boolean;
};

function simulate(colors: string[]): Particle[] {
  return Array.from({ length: PARTICLES }, () => {
    const angle = (Math.random() - 0.5) * SPREAD_DEG * (Math.PI / 180);
    const velocity = START_VELOCITY * (0.5 + Math.random() * 0.5);
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity;
    let x = 0;
    let y = 0;
    const xs: number[] = [0];
    const ys: number[] = [0];
    for (let tick = 1; tick <= TICKS; tick++) {
      vx *= DECAY;
      vy *= DECAY;
      vy += GRAVITY;
      x += vx;
      y += vy;
      if (SAMPLES.includes(tick)) {
        xs.push(x);
        ys.push(y);
      }
    }
    return {
      xs,
      ys,
      size: SCALAR * (2 + Math.random() * 4),
      color: colors[Math.floor(Math.random() * colors.length)],
      circle: Math.random() < 0.5,
    };
  });
}

export function ConfettiBurst({
  onDone,
}: {
  onDone: () => void;
}): ReactElement {
  const { width, height } = useWindowDimensions();
  const p = useCoachPalette();
  const progress = useRef(new Animated.Value(0)).current;
  const { reward, alpha } = p;
  const particles = useMemo(
    () => simulate([reward, alpha(reward, 0.85), alpha(reward, 0.7)]),
    [reward, alpha],
  );
  const input = SAMPLES.map((s) => s / TICKS);

  useEffect(() => {
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => run.stop();
  }, [progress, onDone]);

  return (
    <Animated.View
      testID="ai-coach-confetti"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {particles.map((pt, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            start: width / 2 - pt.size,
            top: height / 2 - pt.size,
            width: pt.size * 2,
            height: pt.size * 2,
            borderRadius: pt.circle ? pt.size : 0,
            backgroundColor: pt.color,
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: input,
                  outputRange: pt.xs,
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: input,
                  outputRange: pt.ys,
                }),
              },
            ],
          }}
        />
      ))}
    </Animated.View>
  );
}
