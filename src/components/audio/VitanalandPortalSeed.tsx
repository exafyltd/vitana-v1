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
  
  // Animation parameters
  const petalScale = isListening ? 1.08 + (volumeLevel * 0.12) : isProcessing ? 0.92 : 1;
  const petalGlow = isListening ? 0.8 + (volumeLevel * 0.2) : 0.6;
  const coreGlow = isProcessing ? 0.9 : isListening ? 0.5 : 0.4;
  const shimmerOpacity = isListening ? 0.4 + (volumeLevel * 0.3) : 0;

  // Generate 8 petals
  const petals = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    rotation: (360 / 8) * i,
  }));

  return (
    <div className="relative w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]">
      {/* Outer atmospheric glow */}
      <motion.div
        className="absolute inset-[-40px] blur-3xl"
        style={{
          background: isError
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(76, 200, 244, 0.12) 0%, rgba(255, 109, 168, 0.08) 50%, transparent 80%)',
        }}
        animate={{
          scale: isListening ? [1, 1.05, 1] : [1, 1.02, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: isListening ? 2 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Energy Bloom Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Petals */}
        <div className="absolute inset-0">
          {petals.map((petal) => (
            <motion.div
              key={petal.id}
              className="absolute inset-0"
              style={{
                transformOrigin: 'center center',
              }}
              animate={{
                rotate: petal.rotation,
              }}
            >
              {/* Petal shape */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: '80px',
                  height: '120px',
                  background: `linear-gradient(180deg, 
                    rgba(13, 44, 243, ${petalGlow * 0.6}) 0%, 
                    rgba(76, 200, 244, ${petalGlow * 0.7}) 40%, 
                    rgba(255, 109, 168, ${petalGlow * 0.5}) 80%, 
                    transparent 100%)`,
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  filter: 'blur(8px)',
                  boxShadow: isListening 
                    ? `0 0 30px rgba(76, 200, 244, ${petalGlow})` 
                    : `0 0 15px rgba(76, 200, 244, ${petalGlow * 0.5})`,
                  transformOrigin: 'center bottom',
                }}
                animate={{
                  scale: [petalScale * 0.98, petalScale * 1.02, petalScale * 0.98],
                  y: [-60, -58, -60],
                }}
                transition={{
                  duration: isListening ? 1.5 : 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: petal.id * 0.1,
                }}
              />

              {/* Petal edge glow (listening state) */}
              {isListening && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: '82px',
                    height: '122px',
                    background: `linear-gradient(180deg, 
                      rgba(255, 255, 255, ${shimmerOpacity * 0.8}) 0%, 
                      rgba(76, 200, 244, ${shimmerOpacity}) 50%, 
                      transparent 100%)`,
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    filter: 'blur(4px)',
                    transformOrigin: 'center bottom',
                  }}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [shimmerOpacity * 0.6, shimmerOpacity, shimmerOpacity * 0.6],
                    y: [-60, -58, -60],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: petal.id * 0.08,
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Central core glow */}
        <motion.div
          className="relative z-10"
          animate={{
            scale: isProcessing ? [1, 1.05, 1] : [0.98, 1.02, 0.98],
            opacity: coreGlow,
          }}
          transition={{
            duration: isProcessing ? 2 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            className="w-12 h-12 lg:w-16 lg:h-16 rounded-full blur-xl"
            style={{
              background: isError
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.4) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(76, 200, 244, 0.6) 40%, rgba(255, 109, 168, 0.3) 70%, transparent 100%)',
              boxShadow: isError
                ? '0 0 40px rgba(239, 68, 68, 0.6)'
                : '0 0 40px rgba(255, 255, 255, 0.4)',
            }}
          />
        </motion.div>

        {/* Iridescent shimmer overlay (listening state) */}
        {isListening && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, rgba(76, 200, 244, 0.1) 40%, transparent 70%)',
              mixBlendMode: 'overlay',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6 + (volumeLevel * 0.4), 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Error overlay */}
        {isError && (
          <motion.div
            className="absolute inset-0 bg-red-500/10 backdrop-blur-sm rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {/* Soft bloom effect */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-20"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(76, 200, 244, 0.15) 40%, transparent 70%)',
          filter: 'blur(25px)',
        }}
      />
    </div>
  );
}
