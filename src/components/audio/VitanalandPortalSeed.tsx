import { motion } from 'framer-motion';

interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  volumeLevel: number; // 0-1 range
  size?: 'sm' | 'nav' | 'md' | 'lg';
  layoutId?: string;
  glowIntensity?: number; // 0 = no external halos, 1 = full halos (default)
}

/** State-driven color map for the ORB visual system */
const stateColors: Record<string, { r: number; g: number; b: number }> = {
  idle:       { r: 76, g: 200, b: 244 },   // Soft cyan #4CC8F4
  listening:  { r: 59, g: 130, b: 246 },   // Blue #3B82F6
  processing: { r: 251, g: 191, b: 36 },   // Yellow #FBBF24
  speaking:   { r: 6, g: 214, b: 160 },    // Turquoise #06D6A0
  error:      { r: 248, g: 113, b: 113 },  // Red #F87171
};

function getStateRgba(state: string, alpha: number): string {
  const c = stateColors[state] || stateColors.idle;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

export function VitanalandPortalSeed({ 
  audioState, 
  volumeLevel,
  size = 'lg',
  layoutId,
  glowIntensity = 1
}: VitanalandPortalSeedProps) {
  const sizeConfig = {
    sm: {
      container: 'w-12 h-12',
      outerHaloInset: -20,
      secondHaloInset: -24,
      outerBlur: 22,
      secondBlur: 28,
      nebulaScale: 0.33,
      auroraScale: 0.33,
      fragmentScale: 0.33,
      coreSize: 32,
      shellBorder: 0,
      rimHighlight: 8,
      waveCount: 3,
      waveBaseSize: 48,
    },
    nav: {
      container: 'w-[60px] h-[60px]',
      outerHaloInset: -26,
      secondHaloInset: -32,
      outerBlur: 26,
      secondBlur: 32,
      nebulaScale: 0.43,
      auroraScale: 0.43,
      fragmentScale: 0.43,
      coreSize: 43,
      shellBorder: 0,
      rimHighlight: 11,
      waveCount: 3,
      waveBaseSize: 60,
    },
    md: {
      container: 'w-20 h-20',
      outerHaloInset: -36,
      secondHaloInset: -44,
      outerBlur: 30,
      secondBlur: 38,
      nebulaScale: 0.65,
      auroraScale: 0.65,
      fragmentScale: 0.65,
      coreSize: 60,
      shellBorder: 0,
      rimHighlight: 16,
      waveCount: 4,
      waveBaseSize: 80,
    },
    lg: {
      container: 'w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]',
      outerHaloInset: -50,
      secondHaloInset: -56,
      outerBlur: 40,
      secondBlur: 50,
      nebulaScale: 1,
      auroraScale: 1,
      fragmentScale: 1,
      coreSize: 100,
      shellBorder: 0,
      rimHighlight: 30,
      waveCount: 4,
      waveBaseSize: 200,
    }
  };

  const config = sizeConfig[size];

  const isListening = audioState === 'listening';
  const isProcessing = audioState === 'processing';
  const isSpeaking = audioState === 'speaking';
  const isError = audioState === 'error';
  
  const haloScale = isListening ? 1 + (volumeLevel * 0.05) : 1;
  const coreBrightness = isListening ? 0.7 + (volumeLevel * 0.25) : isProcessing ? 0.5 : 0.72;
  const particleSpeed = isListening ? 0.6 : isProcessing ? 2 : 1;
  const auroraSpeed = isListening ? 0.85 : isProcessing ? 1.5 : 1;
  const tiltAngle = isListening ? volumeLevel * 2 : 0;

  // Wave animation speed varies by state
  const waveDuration = isSpeaking ? 3.5 : isListening ? 5 : 4;
  const showWaves = (isSpeaking || isListening) && glowIntensity > 0;

  const microFragments = [
    { size: 10 * config.fragmentScale, blur: 4 * config.fragmentScale, opacity: 0.85, zDepth: 1.3, color: 'rgba(255, 255, 255, 0.9)', angle: 0.3, radius: 35 * config.fragmentScale },
    { size: 8 * config.fragmentScale, blur: 3.5 * config.fragmentScale, opacity: 0.75, zDepth: 1.1, color: 'rgba(76, 200, 244, 0.85)', angle: 1.8, radius: 42 * config.fragmentScale },
    { size: 7 * config.fragmentScale, blur: 3 * config.fragmentScale, opacity: 0.65, zDepth: 0.9, color: 'rgba(255, 109, 168, 0.8)', angle: 3.5, radius: 38 * config.fragmentScale },
    { size: 9 * config.fragmentScale, blur: 4 * config.fragmentScale, opacity: 0.7, zDepth: 1.0, color: 'rgba(200, 180, 240, 0.8)', angle: 5.0, radius: 40 * config.fragmentScale },
  ];

  const auroraStrands = [
    { id: 'aurora-1', path: 'M20,50 Q40,20 60,50 T100,50', color: 'rgba(76, 200, 244, 0.4)', width: 3, blur: 8, duration: 18 },
    { id: 'aurora-2', path: 'M30,70 Q50,40 70,70 T110,70', color: 'rgba(160, 155, 220, 0.35)', width: 2.5, blur: 10, duration: 22 },
    { id: 'aurora-3', path: 'M25,35 Q60,50 80,30 T120,40', color: 'rgba(255, 109, 168, 0.3)', width: 2, blur: 12, duration: 26 },
    { id: 'aurora-4', path: 'M15,60 Q45,65 65,55 T95,60', color: 'rgba(76, 200, 244, 0.25)', width: 2.5, blur: 9, duration: 20 },
  ];

  // Generate water wave ripple configs
  const waves = Array.from({ length: config.waveCount }, (_, i) => ({
    delay: i * (waveDuration / config.waveCount),
    maxScale: 2 + i * 0.3,
    blurSize: 15 + i * 8,
    spreadSize: 3 + i * 2,
    startOpacity: 0.35 - i * 0.05,
  }));

  return (
    <motion.div 
      className={`relative ${config.container}`}
      layoutId={layoutId}
    >
      {/* === WATER WAVE RIPPLES === */}
      {glowIntensity > 0 && waves.map((wave, i) => (
        <motion.div
          key={`wave-${i}`}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'transparent',
            boxShadow: `0 0 ${wave.blurSize}px ${wave.spreadSize}px ${getStateRgba(audioState, wave.startOpacity)}`,
          }}
          animate={{
            scale: [1, wave.maxScale],
            opacity: [wave.startOpacity, 0],
          }}
          transition={{
            duration: waveDuration,
            repeat: Infinity,
            ease: 'easeOut',
            delay: wave.delay,
          }}
        />
      ))}

      {/* Outer glow cloud — doubled size, state-colored */}
      {glowIntensity > 0 && (
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: `${config.outerHaloInset}px`,
            background: `radial-gradient(ellipse 120% 110%, ${getStateRgba(audioState, 0.45 * glowIntensity)} 0%, ${getStateRgba(audioState, 0.2 * glowIntensity)} 40%, transparent 70%)`,
            filter: `blur(${config.outerBlur}px)`,
            transform: 'scale(1.1, 1.05)',
          }}
          animate={{
            scale: haloScale * 1.05,
            opacity: isListening ? [0.7, 1, 0.7] : [0.8, 1, 0.8],
          }}
          transition={{
            scale: { duration: 0.3, ease: 'easeOut' },
            opacity: { duration: isListening ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}

      {/* Second glow cloud layer — doubled, state-colored */}
      {glowIntensity > 0 && (
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: `${config.secondHaloInset}px`,
            background: `radial-gradient(ellipse 115% 110%, ${getStateRgba(audioState, 0.2 * glowIntensity)} 0%, ${getStateRgba(audioState, 0.1 * glowIntensity)} 40%, transparent 70%)`,
            filter: `blur(${config.secondBlur}px)`,
            transform: 'scale(1.15, 1.1)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main sphere container with 3D depth and organic morphing */}
      <motion.div
        className="relative w-full h-full"
        style={{
          perspective: '800px',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        animate={{
          scale: isProcessing ? [1, 1.01, 1] : [0.99, 1.01, 0.99],
          rotateY: tiltAngle,
          scaleX: isProcessing 
            ? [1, 1.005, 1]
            : isListening
            ? [1, 1.02 + (volumeLevel * 0.01), 1]
            : [1, 1.038, 0.962, 1.038, 1],
          scaleY: isProcessing 
            ? [1, 0.995, 1]
            : isListening
            ? [1, 0.98 - (volumeLevel * 0.01), 1]
            : [1, 0.962, 1.038, 0.962, 1],
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
          scaleX: {
            duration: isProcessing ? 6 : isListening ? 2 : 6.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          scaleY: {
            duration: isProcessing ? 6 : isListening ? 2 : 6.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        {/* Glass shell — NO border, NO rim — pure 3D */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(13, 44, 243, 0.22) 0%, rgba(13, 44, 243, 0.55) 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            boxShadow: glowIntensity > 0
              ? `0 0 ${config.rimHighlight}px ${getStateRgba(audioState, 0.4)}, inset 0 0 ${config.rimHighlight * 0.6}px rgba(255, 109, 168, 0.25)`
              : '0 0 24px rgba(0, 0, 0, 0.42), 0 0 10px rgba(255, 255, 255, 0.25), inset 0 0 40px rgba(255, 255, 255, 0.15)',
            border: 'none',
            backdropFilter: 'blur(12px) saturate(125%)',
            WebkitBackdropFilter: 'blur(12px) saturate(125%)',
            isolation: 'isolate',
          }}
        >
          {/* Vignette effect for depth */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.45)',
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

          {/* Nebula cloud layer 1 - aqua swirls */}
          <motion.div
            className="absolute inset-0 opacity-60"
            style={{
              background: 'radial-gradient(circle at 35% 40%, rgba(76, 200, 244, 0.45) 0%, transparent 70%)',
              filter: `blur(${15 * config.nebulaScale}px)`,
            }}
            animate={{
              rotate: 360,
              opacity: isProcessing ? 0.35 : 0.6,
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
            className="absolute inset-0 opacity-50"
            style={{
              background: 'radial-gradient(circle at 65% 55%, rgba(255, 109, 168, 0.4) 0%, transparent 65%)',
              filter: `blur(${18 * config.nebulaScale}px)`,
            }}
            animate={{
              rotate: -360,
              opacity: isProcessing ? 0.3 : 0.5,
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

          {/* Nebula cloud layer 3 */}
          <motion.div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(160, 155, 220, 0.35) 0%, transparent 60%)',
              filter: `blur(${20 * config.nebulaScale}px)`,
            }}
            animate={{
              rotate: 360,
              opacity: isProcessing ? 0.25 : 0.4,
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

          {/* Nebula cloud layer 4 */}
          <motion.div
            className="absolute inset-0 opacity-35"
            style={{
              background: 'radial-gradient(ellipse at 45% 60%, rgba(76, 200, 244, 0.35) 0%, rgba(255, 109, 168, 0.25) 40%, transparent 70%)',
              filter: `blur(${22 * config.nebulaScale}px)`,
            }}
            animate={{
              rotate: -360,
              opacity: isProcessing ? 0.2 : 0.35,
            }}
            transition={{
              rotate: {
                duration: 95,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: 0.5,
              },
            }}
          />

          {/* Aurora Flow Paths */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 160 160"
            style={{ 
              transform: `translate(0, 0) scale(${config.auroraScale})`,
              transformOrigin: 'center'
            }}
          >
            {auroraStrands.map((strand, index) => (
              <motion.path
                key={strand.id}
                d={strand.path}
                fill="none"
                stroke={isProcessing ? `${strand.color.replace(/0\.\d+\)/, '0.15)')}` : strand.color}
                strokeWidth={strand.width}
                strokeLinecap="round"
                style={{
                  filter: `blur(${strand.blur * config.auroraScale}px)`,
                  mixBlendMode: 'screen',
                  opacity: isListening ? 0.85 : 0.7,
                }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: isListening ? [0.7, 0.9, 0.7] : [0.6, 0.8, 0.6],
                }}
                transition={{
                  pathLength: {
                    duration: strand.duration * auroraSpeed,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * (strand.duration * 0.25),
                  },
                  opacity: {
                    duration: strand.duration * auroraSpeed * 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.5,
                  },
                }}
              />
            ))}
          </svg>

          {/* Outer core — state-colored glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${config.coreSize * 0.96}px`,
              height: `${config.coreSize * 0.96}px`,
              background: `radial-gradient(circle, ${getStateRgba(audioState, 0.7)} 0%, rgba(255, 109, 168, 0.5) 60%, transparent 100%)`,
              filter: `blur(${24 * config.nebulaScale}px)`,
              boxShadow: glowIntensity > 0 
                ? `0 0 ${60 * config.nebulaScale}px ${getStateRgba(audioState, 0.8)}, 0 0 ${80 * config.nebulaScale}px ${getStateRgba(audioState, 0.4)}`
                : 'none',
            }}
            animate={{
              scale: isListening ? [1, 1.1, 1] : [0.95, 1.05, 0.95],
              opacity: coreBrightness * 0.9,
              filter: isListening 
                ? ['blur(24px) hue-rotate(0deg)', 'blur(24px) hue-rotate(15deg)', 'blur(24px) hue-rotate(0deg)']
                : ['blur(24px) hue-rotate(0deg)', 'blur(24px) hue-rotate(10deg)', 'blur(24px) hue-rotate(0deg)'],
            }}
            transition={{
              scale: {
                duration: isProcessing ? 3 : 5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              opacity: { duration: 0.3 },
              filter: {
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          />

          {/* Inner core - bright white center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${config.coreSize * 0.56}px`,
              height: `${config.coreSize * 0.56}px`,
              background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
              filter: `blur(${18 * config.nebulaScale}px)`,
              boxShadow: `0 0 ${40 * config.nebulaScale}px rgba(255, 255, 255, 1), 0 0 ${60 * config.nebulaScale}px rgba(255, 255, 255, 0.6)`,
            }}
            animate={{
              scale: isListening ? [1, 1.2, 1] : [0.95, 1.05, 0.95],
              opacity: coreBrightness,
            }}
            transition={{
              scale: {
                duration: isProcessing ? 2.5 : 5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              opacity: { duration: 0.3 },
            }}
          />

          {/* Micro core - pure white definition point */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${6 * config.fragmentScale}px`,
              height: `${6 * config.fragmentScale}px`,
              background: 'rgba(255, 255, 255, 1)',
              filter: `blur(${1 * config.fragmentScale}px)`,
              boxShadow: `0 0 ${12 * config.fragmentScale}px rgba(255, 255, 255, 1), 0 0 ${18 * config.fragmentScale}px rgba(255, 255, 255, 0.8)`,
            }}
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: coreBrightness * 1.1,
            }}
            transition={{
              scale: {
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              opacity: { duration: 0.3 },
            }}
          />

          {/* Premium micro-fragments */}
          <div className="absolute inset-0">
            {microFragments.map((fragment, index) => {
              const x = Math.cos(fragment.angle) * fragment.radius;
              const y = Math.sin(fragment.angle) * fragment.radius;
              
              return (
                <motion.div
                  key={`fragment-${index}`}
                  className="absolute top-1/2 left-1/2 rounded-full"
                  style={{
                    width: `${fragment.size}px`,
                    height: `${fragment.size}px`,
                    background: fragment.color,
                    boxShadow: `0 0 ${fragment.size * 3}px ${fragment.color}`,
                    filter: `blur(${fragment.blur}px)`,
                  }}
                  animate={{
                    x: [x, x + (Math.cos(fragment.angle + 0.5) * 12 * fragment.zDepth), x],
                    y: [y, y + (Math.sin(fragment.angle + 0.5) * 12 * fragment.zDepth), y],
                    opacity: isProcessing ? fragment.opacity * 0.4 : [fragment.opacity * 0.75, fragment.opacity, fragment.opacity * 0.75],
                    scale: [0.9, 1.05 * fragment.zDepth, 0.9],
                  }}
                  transition={{
                    duration: (4 + index * 0.6) * particleSpeed,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.5,
                  }}
                />
              );
            })}
          </div>

          {/* Bottom light falloff for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.4) 100%)',
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
    </motion.div>
  );
}
