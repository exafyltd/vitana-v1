import { motion } from 'framer-motion';

interface OrbSoundwaveRingsProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  volumeLevel: number;
  children: React.ReactNode;
}

const STATE_COLORS: Record<string, string> = {
  listening: '#3B82F6',   // Bright blue
  speaking: '#06D6A0',    // Bright turquoise
  processing: '#FBBF24',  // Pastel yellow
  idle: '#F87171',        // Pastel red
  error: '#F87171',       // Pastel red
};

const RING_COUNT = 4;

// Ring offsets from center (px beyond the orb radius)
const RING_OFFSETS = [24, 44, 66, 90];
const RING_OPACITIES = [0.4, 0.3, 0.2, 0.1];
const RING_DELAYS = [0, 0.15, 0.3, 0.45];

export function OrbSoundwaveRings({ audioState, volumeLevel, children }: OrbSoundwaveRingsProps) {
  const color = STATE_COLORS[audioState] || STATE_COLORS.idle;

  return (
    <div className="relative flex items-center justify-center">
      {/* Rings behind the orb */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring
          key={i}
          index={i}
          color={color}
          audioState={audioState}
          volumeLevel={volumeLevel}
        />
      ))}
      {/* The orb itself */}
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
  const delay = RING_DELAYS[index];
  const size = offset * 2;

  // State-driven animation variants
  const getAnimation = () => {
    switch (audioState) {
      case 'listening': {
        // Pulse based on volume, staggered per ring
        const volScale = 1 + volumeLevel * (0.15 + index * 0.08);
        return {
          scale: [volScale * 0.95, volScale, volScale * 0.95],
          opacity: [baseOpacity * 0.7, baseOpacity, baseOpacity * 0.7],
        };
      }
      case 'speaking': {
        // Ripple outward sequentially
        return {
          scale: [1, 1.15 + index * 0.05, 1],
          opacity: [baseOpacity * 0.5, baseOpacity, baseOpacity * 0.5],
        };
      }
      case 'processing': {
        // Slow breathing
        return {
          scale: [1, 1.08, 1],
          opacity: [baseOpacity * 0.4, baseOpacity * 0.8, baseOpacity * 0.4],
        };
      }
      default: {
        // Idle/error — static, low opacity
        return {
          scale: 1,
          opacity: baseOpacity * 0.35,
        };
      }
    }
  };

  const getTransition = () => {
    switch (audioState) {
      case 'listening':
        return {
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay,
        };
      case 'speaking':
        return {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeOut' as const,
          delay: delay * 2,
        };
      case 'processing':
        return {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay,
        };
      default:
        return {
          duration: 0.5,
          ease: 'easeOut' as const,
        };
    }
  };

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: `calc(100% + ${size}px)`,
        height: `calc(100% + ${size}px)`,
        border: `1.5px solid ${color}`,
        filter: `blur(${0.5 + index * 0.3}px)`,
      }}
      animate={getAnimation()}
      transition={getTransition()}
    />
  );
}
