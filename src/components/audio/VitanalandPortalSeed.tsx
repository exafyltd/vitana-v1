import { motion } from 'framer-motion';

interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number; // 0-1 range
}

export function VitanalandPortalSeed({ audioState, volumeLevel }: VitanalandPortalSeedProps) {
  // Calculate dynamic values based on state and volume
  const isListening = audioState === 'listening';
  const isProcessing = audioState === 'processing';
  const isError = audioState === 'error';
  
  const haloScale = isListening ? 1 + (volumeLevel * 0.05) : 1;
  const coreBrightness = isListening ? 0.7 + (volumeLevel * 0.25) : isProcessing ? 0.5 : 0.6;
  const particleSpeed = isListening ? 0.6 : isProcessing ? 2 : 1;
  const tiltAngle = isListening ? volumeLevel * 2 : 0;

  return (
    <div className="relative w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]">
      {/* Outer halo - gravitational boundary */}
      <motion.div
        className="absolute inset-[-25px] rounded-full"
        style={{
          background: isError
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.1) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(76, 200, 244, 0.3) 0%, rgba(76, 200, 244, 0.15) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: haloScale,
          opacity: isListening ? [0.8, 1, 0.8] : 1,
        }}
        transition={{
          scale: { duration: 0.2, ease: 'easeOut' },
          opacity: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Thin halo ring */}
      <motion.div
        className="absolute inset-[-12px] rounded-full"
        style={{
          background: isError
            ? 'radial-gradient(circle, transparent 70%, rgba(239, 68, 68, 0.4) 75%, transparent 80%)'
            : 'radial-gradient(circle, transparent 70%, rgba(76, 200, 244, 0.6) 75%, transparent 80%)',
          filter: 'blur(2px)',
        }}
        animate={{
          scale: haloScale,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      />

      {/* Main sphere container with 3D depth */}
      <motion.div
        className="relative w-full h-full"
        style={{
          perspective: '800px',
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isProcessing ? [1, 1.01, 1] : [0.99, 1.01, 0.99],
          rotateY: tiltAngle,
        }}
        transition={{
          scale: {
            duration: isProcessing ? 3.5 : 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotateY: {
            duration: 0.3,
            ease: 'easeOut',
          },
        }}
      >
        {/* Glass shell outer layer with reflection */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(13, 44, 243, 0.15) 0%, rgba(13, 44, 243, 0.45) 100%)',
            boxShadow: isError
              ? '0 0 50px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(239, 68, 68, 0.2)'
              : '0 0 50px rgba(76, 200, 244, 0.3), inset 0 0 30px rgba(255, 109, 168, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Glass reflection highlight */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 25% 20%, rgba(255, 255, 255, 0.25) 0%, transparent 40%)',
            }}
            animate={{
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Nebula cloud layer 1 - aqua swirls */}
          <motion.div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(ellipse at 35% 40%, rgba(76, 200, 244, 0.6) 0%, transparent 55%)',
            }}
            animate={{
              rotate: isProcessing ? [0, 360] : [0, 180, 0],
            }}
            transition={{
              duration: isProcessing ? 25 : 35,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Nebula cloud layer 2 - rose swirls */}
          <motion.div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 65% 55%, rgba(255, 109, 168, 0.5) 0%, transparent 60%)',
            }}
            animate={{
              rotate: isProcessing ? [0, -360] : [0, -120, 0],
            }}
            transition={{
              duration: isProcessing ? 30 : 45,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Glowing core */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              opacity: coreBrightness,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
          >
            <div
              className="w-14 h-14 lg:w-20 lg:h-20 rounded-full"
              style={{
                background: isError
                  ? 'radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.3) 60%, transparent 100%)'
                  : 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(76, 200, 244, 0.8) 35%, rgba(255, 109, 168, 0.4) 70%, transparent 100%)',
                filter: 'blur(12px)',
                boxShadow: isError
                  ? '0 0 35px rgba(239, 68, 68, 0.7)'
                  : '0 0 35px rgba(76, 200, 244, 0.6)',
              }}
            />
          </motion.div>

          {/* Floating internal spark particles - sparse and premium */}
          <div className="absolute inset-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[3px] h-[3px] rounded-full"
                style={{
                  left: `${30 + Math.random() * 40}%`,
                  top: `${30 + Math.random() * 40}%`,
                  background: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
                  filter: 'blur(0.5px)',
                }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 20],
                  y: isProcessing ? 0 : [-15, 5],
                  opacity: [0.5, 1, 0.5],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: (4 + Math.random() * 3) * particleSpeed,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Bottom light falloff for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.35) 100%)',
            }}
          />

          {/* Glass rim shimmer */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Error overlay */}
          {isError && (
            <motion.div
              className="absolute inset-0 bg-red-500/15 rounded-full backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
