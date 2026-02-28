import { motion } from 'framer-motion';

interface OrbSoundwaveRingsProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  volumeLevel: number;
  children: React.ReactNode;
}

const STATE_COLORS: Record<string, string> = {
  listening: '#3B82F6',
  speaking: '#06D6A0',
  processing: '#FBBF24',
  idle: '#F87171',
  error: '#F87171',
};

const RING_COUNT = 4;

// Exponential spacing — like waves in water, gaps grow dramatically
// Gaps: 20, 26, 48, 90 → gap 3→4 (90) > gaps 1+2+3 combined (94 ≈ close)
const RING_OFFSETS = [20, 46, 94, 184];
const RING_OPACITIES = [0.35, 0.25, 0.15, 0.08];
const RING_BLURS = [3, 6, 10, 16];
const RING_WIDTHS = [6, 8, 12, 18]; // Soft glow band thickness
const RING_DELAYS = [0, 0.12, 0.28, 0.5];

export function OrbSoundwaveRings({ audioState, volumeLevel, children }: OrbSoundwaveRingsProps) {
  const color = STATE_COLORS[audioState] || STATE_COLORS.idle;

  return (
    <div className="relative flex items-center justify-center">
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring
          key={i}
          index={i}
          color={color}
          audioState={audioState}
          volumeLevel={volumeLevel}
        />
      ))}
      {children}
    </div>
  );
}

interface RingProps {
  index: number;
  color: string;
  audioState: string;
  volumeLevel: number;
}

function Ring({ index, color, audioState, volumeLevel }: RingProps) {
  const offset = RING_OFFSETS[index];
  const baseOpacity = RING_OPACITIES[index];
  const blur = RING_BLURS[index];
  const width = RING_WIDTHS[index];
  const delay = RING_DELAYS[index];
  const size = offset * 2;

  const getAnimation = () => {
    switch (audioState) {
      case 'listening': {
        const volScale = 1 + volumeLevel * (0.12 + index * 0.06);
        return {
          scale: [volScale * 0.96, volScale, volScale * 0.96],
          opacity: [baseOpacity * 0.6, baseOpacity, baseOpacity * 0.6],
        };
      }
      case 'speaking': {
        return {
          scale: [1, 1.12 + index * 0.04, 1],
          opacity: [baseOpacity * 0.4, baseOpacity, baseOpacity * 0.4],
        };
      }
      case 'processing': {
        return {
          scale: [1, 1.06, 1],
          opacity: [baseOpacity * 0.3, baseOpacity * 0.7, baseOpacity * 0.3],
        };
      }
      default: {
        return {
          scale: 1,
          opacity: baseOpacity * 0.3,
        };
      }
    }
  };

  const getTransition = () => {
    switch (audioState) {
      case 'listening':
        return { duration: 0.6, repeat: Infinity, ease: 'easeInOut' as const, delay };
      case 'speaking':
        return { duration: 1.2, repeat: Infinity, ease: 'easeOut' as const, delay: delay * 2 };
      case 'processing':
        return { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const, delay };
      default:
        return { duration: 0.5, ease: 'easeOut' as const };
    }
  };

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: `calc(100% + ${size}px)`,
        height: `calc(100% + ${size}px)`,
        // Soft glow band — no hard border, just a diffused color wash
        boxShadow: `0 0 ${width}px ${Math.round(width * 0.6)}px ${color}`,
        background: 'transparent',
        filter: `blur(${blur}px)`,
      }}
      animate={getAnimation()}
      transition={getTransition()}
    />
  );
}
