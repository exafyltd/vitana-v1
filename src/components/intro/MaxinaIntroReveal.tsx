import { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import MaxinaBallerinaMark from './MaxinaBallerinaMark';

/**
 * A flat silhouette rotated IN-PLANE (CSS `rotate`) reads as a cutout
 * tumbling like a coin, not a person spinning — at 90°/270° the twirl-skirt
 * mark foreshortens into an unrecognizable sideways blob (confirmed by
 * screenshotting the earlier rotate-based version frame by frame). The
 * standard trick for representing rotation around a VERTICAL axis on a flat
 * asset is to squash it horizontally instead: `scaleX` sweeping through 0
 * and flipping sign each half-turn (mirroring the asymmetric skirt/legs, the
 * way the other side of a real spin would look), while `scaleY` stays put.
 * The mark stays upright and recognizable through the whole sequence, and
 * the sign flips read as "turning toward and away from the viewer" — a real
 * pirouette — rather than tumbling.
 *
 * `buildDeceleratingSpin` generates that sweep programmatically rather than
 * as a hand-typed literal: `halfTurns` half-rotations (so `halfTurns / 2`
 * full spins), each one taking `growth`x longer than the last, so the whole
 * sequence is fast at the start and settles at the end — "swing with speed"
 * that decelerates into the resting pose, not a constant-speed spin.
 */
function buildDeceleratingSpin(halfTurns: number, growth: number) {
  const values: number[] = [1];
  for (let i = 1; i <= halfTurns; i++) {
    values.push(i % 2 === 0 ? 1 : -1);
  }
  const weights = Array.from({ length: halfTurns }, (_, i) => growth ** i);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const times: number[] = [0];
  let acc = 0;
  for (const w of weights) {
    acc += w / totalWeight;
    times.push(acc);
  }
  return { values, times };
}

// 10 half-turns = 5 full spins, each 30% longer than the last.
const { values: SPIN_SCALE_X, times: SPIN_TIMES } = buildDeceleratingSpin(10, 1.3);

interface MaxinaIntroRevealProps {
  className?: string;
  /**
   * Fired once the reveal has visibly begun — the caller uses this instead
   * of an arbitrary fixed delay to know when it's safe to start fading in
   * the surrounding text, since this component (not a video element) now
   * owns the actual timing of "something happened on screen".
   */
  onFormed?: () => void;
}

/** One warm-toned bloom layer of the paint-bloom reveal. Several of these,
 * offset and staggered, read as an organic ink bloom instead of a flat
 * circle. Colors are the same champagne/gold/ivory family as the MAXINA
 * wordmark gradient and the existing flare accent elsewhere on this screen —
 * deliberately not the rainbow palette of the reference clip, to stay
 * consistent with the rest of the (dark, gold-accented) sign-in funnel. */
function Bloom({
  color,
  size,
  offsetX,
  offsetY,
  delay,
  reduced,
}: {
  color: string;
  size: number;
  offsetX: number;
  offsetY: number;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl"
      style={{
        width: size,
        height: size,
        left: `calc(50% + ${offsetX}px - ${size / 2}px)`,
        top: `calc(50% + ${offsetY}px - ${size / 2}px)`,
        background: `radial-gradient(circle, ${color} 0%, transparent 72%)`,
        mixBlendMode: 'screen',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={
        reduced
          ? { opacity: 0.35, scale: 1, transition: { duration: 0.4 } }
          : {
              opacity: [0, 0.9, 0],
              scale: [0, 1.25, 1.05],
              transition: { duration: 2.6, delay, times: [0, 0.45, 1], ease: 'easeOut' },
            }
      }
    />
  );
}

export default function MaxinaIntroReveal({ className, onFormed }: MaxinaIntroRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const markControls = useAnimationControls();

  useEffect(() => {
    // Notify the caller as soon as the reveal has visibly started, so the
    // surrounding copy doesn't wait on a full animation cycle to appear.
    const formedTimer = window.setTimeout(() => onFormed?.(), prefersReducedMotion ? 150 : 300);

    let cancelled = false;
    async function run() {
      if (prefersReducedMotion) {
        await markControls.start({ opacity: 1, scale: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'easeOut' } });
        return;
      }

      // Phase 1: pop in, upright, at rest — no spin yet.
      await markControls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.35, ease: 'easeOut' },
      });
      if (cancelled) return;

      // Phase 2: fast decelerating spin (see buildDeceleratingSpin above) —
      // reads as the dancer spinning up out of the bloom and settling into
      // her final pose, staying upright throughout instead of tumbling.
      await markControls.start({
        scaleX: SPIN_SCALE_X,
        transition: { duration: 1.7, times: SPIN_TIMES, ease: 'linear' },
      });
      if (cancelled) return;

      // Phase 3: gentle idle sway once settled, so the mark doesn't read as
      // frozen while the user reads the tagline / decides to tap a button.
      markControls.start({
        rotate: [0, -2, 0, 2, 0],
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      });
    }
    run();

    return () => {
      cancelled = true;
      window.clearTimeout(formedTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion]);

  return (
    <div className={className} aria-hidden="true">
      <div className="relative w-full h-full flex items-center justify-center">
        <Bloom color="rgba(250,230,180,0.65)" size={260} offsetX={0} offsetY={0} delay={0} reduced={!!prefersReducedMotion} />
        <Bloom color="rgba(224,170,82,0.5)" size={190} offsetX={-45} offsetY={-25} delay={0.12} reduced={!!prefersReducedMotion} />
        <Bloom color="rgba(216,150,140,0.35)" size={170} offsetX={40} offsetY={35} delay={0.22} reduced={!!prefersReducedMotion} />
        <Bloom color="rgba(255,253,246,0.55)" size={140} offsetX={20} offsetY={-45} delay={0.3} reduced={!!prefersReducedMotion} />

        <motion.div
          className="relative w-[62%] h-[62%] [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.45))_drop-shadow(0_0_20px_rgba(235,205,150,0.3))]"
          style={{ transformOrigin: '50% 50%' }}
          initial={{ opacity: 0, scale: 0.25, scaleX: 1, rotate: 0 }}
          animate={markControls}
        >
          <MaxinaBallerinaMark className="w-full h-full" />
        </motion.div>
      </div>
    </div>
  );
}
