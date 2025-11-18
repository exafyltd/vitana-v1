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
  const auroraSpeed = isListening ? 0.85 : isProcessing ? 1.5 : 1;
  const tiltAngle = isListening ? volumeLevel * 2 : 0;

  // Premium micro-fragments (4 particles with enhanced bloom)
  const microFragments = [
    { size: 10, blur: 4, opacity: 0.85, zDepth: 1.3, color: 'rgba(255, 255, 255, 0.9)', angle: 0.3, radius: 35 },
    { size: 8, blur: 3.5, opacity: 0.75, zDepth: 1.1, color: 'rgba(76, 200, 244, 0.85)', angle: 1.8, radius: 42 },
    { size: 7, blur: 3, opacity: 0.65, zDepth: 0.9, color: 'rgba(255, 109, 168, 0.8)', angle: 3.5, radius: 38 },
    { size: 9, blur: 4, opacity: 0.7, zDepth: 1.0, color: 'rgba(200, 180, 240, 0.8)', angle: 5.0, radius: 40 },
  ];

  // Aurora flow paths
  const auroraStrands = [
    { id: 'aurora-1', path: 'M20,50 Q40,20 60,50 T100,50', color: 'rgba(76, 200, 244, 0.4)', width: 3, blur: 8, duration: 18 },
    { id: 'aurora-2', path: 'M30,70 Q50,40 70,70 T110,70', color: 'rgba(160, 155, 220, 0.35)', width: 2.5, blur: 10, duration: 22 },
    { id: 'aurora-3', path: 'M25,35 Q60,50 80,30 T120,40', color: 'rgba(255, 109, 168, 0.3)', width: 2, blur: 12, duration: 26 },
    { id: 'aurora-4', path: 'M15,60 Q45,65 65,55 T95,60', color: 'rgba(76, 200, 244, 0.25)', width: 2.5, blur: 9, duration: 20 },
  ];

  return (
    <div className="relative w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]">
      {/* Outer halo - enhanced elliptical */}
      <motion.div
        className="absolute inset-[-25px] rounded-full"
        style={{
          background: isError
            ? 'radial-gradient(ellipse 108% 100%, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 40%, transparent 70%)'
            : 'radial-gradient(ellipse 108% 100%, rgba(76, 200, 244, 0.4) 0%, rgba(76, 200, 244, 0.2) 40%, transparent 70%)',
          filter: 'blur(20px)',
          transform: 'scale(1.08, 1)',
        }}
        animate={{
          scale: haloScale,
          opacity: isListening ? [0.8, 1, 0.8] : [0.9, 1, 0.9],
        }}
        transition={{
          scale: { duration: 0.2, ease: 'easeOut' },
          opacity: { duration: isListening ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Second halo layer for depth */}
      <motion.div
        className="absolute inset-[-28px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse 110% 105%, rgba(76, 200, 244, 0.15) 0%, rgba(76, 200, 244, 0.08) 40%, transparent 70%)',
          filter: 'blur(25px)',
          transform: 'scale(1.1, 1.05)',
        }}
        animate={{
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Thin halo ring - enhanced */}
      <motion.div
        className="absolute inset-[-12px] rounded-full"
        style={{
          background: isError
            ? 'radial-gradient(ellipse 108% 100%, transparent 70%, rgba(239, 68, 68, 0.5) 75%, transparent 80%)'
            : 'radial-gradient(ellipse 108% 100%, transparent 70%, rgba(76, 200, 244, 0.75) 75%, transparent 80%)',
          filter: 'blur(1.5px)',
          transform: 'scale(1.08, 1)',
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
            duration: isProcessing ? 3.5 : 5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotateY: {
            duration: 0.3,
            ease: 'easeOut',
          },
        }}
      >
        {/* Glass shell outer layer with enhanced rim */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(13, 44, 243, 0.15) 0%, rgba(13, 44, 243, 0.45) 100%)',
            boxShadow: isError
              ? '0 0 50px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(239, 68, 68, 0.2)'
              : '0 0 50px rgba(76, 200, 244, 0.4), inset 0 0 30px rgba(255, 109, 168, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          {/* Vignette effect for depth */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.35)',
            }}
          />

          {/* Fresnel edge highlight */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(255, 255, 255, 0.1) 100%)',
            }}
          />

          {/* Glass specular highlight - primary */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 28% 18%, rgba(255, 255, 255, 0.75) 0%, transparent 15%)',
            }}
            animate={{
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Glass specular highlight - secondary */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 75% 80%, rgba(255, 255, 255, 0.35) 0%, transparent 12%)',
            }}
            animate={{
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Inner rim layer */}
          <div
            className="absolute inset-[2px] rounded-full pointer-events-none"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          />

          {/* Rim iridescence */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 45deg, rgba(76, 200, 244, 0.2), rgba(255, 109, 168, 0.2), transparent)',
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.01, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Top-to-bottom brightness gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 30%)',
            }}
          />

          {/* Atmospheric haze layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.15) 100%)',
            }}
          />

          {/* Nebula cloud layer 1 - aqua swirls (slowest) */}
          <motion.div
            className="absolute inset-0 opacity-50"
            style={{
              background: 'radial-gradient(circle at 35% 40%, rgba(76, 200, 244, 0.4) 0%, transparent 70%)',
              filter: 'blur(15px)',
            }}
            animate={{
              rotate: 360,
              opacity: isProcessing ? 0.3 : 0.5,
            }}
            transition={{
              rotate: {
                duration: 55,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: 0.5,
              },
            }}
          />

          {/* Nebula cloud layer 2 - rose swirls */}
          <motion.div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 65% 55%, rgba(255, 109, 168, 0.35) 0%, transparent 65%)',
              filter: 'blur(18px)',
            }}
            animate={{
              rotate: -360,
              opacity: isProcessing ? 0.25 : 0.4,
            }}
            transition={{
              rotate: {
                duration: 70,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: 0.5,
              },
            }}
          />

          {/* Nebula cloud layer 3 - aqua-rose blend (new) */}
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(160, 155, 220, 0.3) 0%, transparent 60%)',
              filter: 'blur(20px)',
            }}
            animate={{
              rotate: 360,
              opacity: isProcessing ? 0.2 : 0.3,
            }}
            transition={{
              rotate: {
                duration: 85,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: 0.5,
              },
            }}
          />

          {/* Enhanced double-core system */}
          {/* Outer core - aqua-rose blend */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(76, 200, 244, 0.8) 0%, rgba(255, 109, 168, 0.6) 60%, transparent 100%)',
              filter: 'blur(20px)',
              boxShadow: '0 0 50px rgba(76, 200, 244, 0.8)',
            }}
            animate={{
              scale: isListening ? [1, 1.1, 1] : [0.98, 1.02, 0.98],
              opacity: coreBrightness * 0.9,
              filter: isListening 
                ? ['blur(20px) hue-rotate(0deg)', 'blur(20px) hue-rotate(15deg)', 'blur(20px) hue-rotate(0deg)']
                : ['blur(20px) hue-rotate(0deg)', 'blur(20px) hue-rotate(10deg)', 'blur(20px) hue-rotate(0deg)'],
            }}
            transition={{
              scale: {
                duration: isProcessing ? 3 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              opacity: {
                duration: 0.3,
              },
              filter: {
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          />

          {/* Inner core - bright white center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)',
              filter: 'blur(16px)',
              boxShadow: '0 0 30px rgba(255, 255, 255, 0.9)',
            }}
            animate={{
              scale: isListening ? [1, 1.2, 1] : [0.95, 1.05, 0.95],
              opacity: coreBrightness,
            }}
            transition={{
              scale: {
                duration: isProcessing ? 2.5 : 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              opacity: {
                duration: 0.3,
              },
            }}
          />

          {/* Premium floating internal spark fragments (6 particles in 3 depth layers) */}
          <div className="absolute inset-0">
            {[
              // Foreground layer (2 particles)
              { count: 2, size: 8, blur: 3, opacity: 0.9, zDepth: 1.2, color: 'rgba(255, 255, 255, 0.9)' },
              // Mid layer (2 particles)
              { count: 2, size: 6, blur: 2, opacity: 0.7, zDepth: 1.0, color: 'rgba(76, 200, 244, 0.85)' },
              // Background layer (2 particles)
              { count: 2, size: 5, blur: 1.5, opacity: 0.5, zDepth: 0.8, color: 'rgba(255, 109, 168, 0.8)' },
            ].flatMap((layer, layerIndex) =>
              Array.from({ length: layer.count }).map((_, i) => {
                const particleIndex = layerIndex * 2 + i;
                // Asymmetric, organic placement
                const angle = (particleIndex / 6) * Math.PI * 2 + (particleIndex * 0.7);
                const radius = 30 + Math.sin(particleIndex * 1.3) * 15;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <motion.div
                    key={`${layerIndex}-${i}`}
                    className="absolute top-1/2 left-1/2 rounded-full"
                    style={{
                      width: `${layer.size}px`,
                      height: `${layer.size}px`,
                      background: layer.color,
                      boxShadow: `0 0 ${layer.size * 2}px ${layer.color}`,
                      filter: `blur(${layer.blur}px)`,
                    }}
                    animate={{
                      x: [x, x + (Math.cos(angle + 0.5) * 15 * layer.zDepth), x],
                      y: [y, y + (Math.sin(angle + 0.5) * 15 * layer.zDepth), y],
                      opacity: isProcessing ? layer.opacity * 0.5 : [layer.opacity * 0.8, layer.opacity, layer.opacity * 0.8],
                      scale: [0.9, 1.1 * layer.zDepth, 0.9],
                    }}
                    transition={{
                      duration: (3.5 + particleIndex * 0.5) * particleSpeed,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: particleIndex * 0.4,
                    }}
                  />
                );
              })
            )}
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
