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
  
  const haloScale = isListening ? 1 + (volumeLevel * 0.03) : 1;
  const coreBrightness = isListening ? 0.6 + (volumeLevel * 0.3) : 0.6;
  const particleSpeed = isListening ? 0.5 : 1;

  return (
    <div className="relative w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]">
      {/* Outer halo */}
      <motion.div
        className="absolute inset-[-20px] rounded-full blur-2xl"
        style={{
          background: isError
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(76, 200, 244, 0.2) 0%, transparent 70%)',
        }}
        animate={{
          scale: haloScale,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      />

      {/* Main sphere container */}
      <motion.div
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(circle, #4cc8f4 0%, #0d2cf3 60%, #1a1a2e 100%)',
          boxShadow: isError
            ? '0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 40px rgba(239, 68, 68, 0.3)'
            : '0 0 60px rgba(76, 200, 244, 0.4), inset 0 0 40px rgba(255, 109, 168, 0.3)',
        }}
        animate={{
          scale: isProcessing ? [1, 1.01, 1] : [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: isProcessing ? 3 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Nebula clouds layer 1 */}
        <motion.div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 30% 30%, rgba(255, 109, 168, 0.6) 0%, transparent 50%)',
          }}
          animate={{
            rotate: isProcessing ? [0, 360] : [0, 120, 0],
          }}
          transition={{
            duration: isProcessing ? 20 : 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Nebula clouds layer 2 */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at 70% 60%, rgba(76, 200, 244, 0.5) 0%, transparent 60%)',
          }}
          animate={{
            rotate: isProcessing ? [0, -360] : [0, -90, 0],
          }}
          transition={{
            duration: isProcessing ? 25 : 40,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Light core */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            opacity: coreBrightness,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
        >
          <div
            className="w-12 h-12 lg:w-16 lg:h-16 rounded-full blur-xl"
            style={{
              background: isError
                ? 'rgba(239, 68, 68, 0.9)'
                : 'rgba(255, 255, 255, 0.8)',
            }}
          />
        </motion.div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, 0],
                x: [Math.random() * 10 - 5, Math.random() * 10 - 5],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: (3 + Math.random() * 4) * particleSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Error overlay */}
        {isError && (
          <motion.div
            className="absolute inset-0 bg-red-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </div>
  );
}
