import { motion } from "framer-motion";

interface OrbCoreProps {
  size: 'sm' | 'md' | 'xl';
  audioState?: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel?: number;
  enableFloat?: boolean;
  layoutId?: string;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'w-16 h-16',
    outerHalo: 'inset-[-14px]',
    secondHalo: 'inset-[-16px]',
    thinRing: 'inset-[-7px]',
    outerBlur: '18px',
    secondBlur: '22px',
    thinBlur: '1.5px',
    breathingScale: [1, 1.02, 1],
    dotSize: 'w-[3px] h-[3px]',
    dotBlur: 'blur(0.5px)',
    outerHaloOpacity: 0.5,
    secondHaloOpacity: 0.18,
  },
  md: {
    container: 'w-24 h-24',
    outerHalo: 'inset-[-18px]',
    secondHalo: 'inset-[-21px]',
    thinRing: 'inset-[-9px]',
    outerBlur: '19px',
    secondBlur: '23px',
    thinBlur: '1.5px',
    breathingScale: [1, 1.025, 1],
    dotSize: 'w-1 h-1',
    dotBlur: 'blur(1px)',
    outerHaloOpacity: 0.4,
    secondHaloOpacity: 0.15,
  },
  xl: {
    container: 'w-[120px] h-[120px] lg:w-[140px] lg:h-[140px]',
    outerHalo: 'inset-[-20px] lg:inset-[-25px]',
    secondHalo: 'inset-[-23px] lg:inset-[-28px]',
    thinRing: 'inset-[-10px] lg:inset-[-12px]',
    outerBlur: '20px',
    secondBlur: '25px',
    thinBlur: '1.5px',
    breathingScale: [1, 1.03, 1],
    dotSize: 'w-1 h-1',
    dotBlur: 'blur(1px)',
    outerHaloOpacity: 0.4,
    secondHaloOpacity: 0.15,
  },
};

export function OrbCore({
  size,
  audioState = 'idle',
  volumeLevel = 0,
  enableFloat = false,
  layoutId,
  className = '',
}: OrbCoreProps) {
  const config = sizeConfig[size];
  
  // Enhanced animations for listening state
  const isListening = audioState === 'listening';
  const isProcessing = audioState === 'processing';
  
  const orbContent = (
    <motion.div
      layoutId={layoutId}
      className={`relative ${config.container} ${className}`}
    >
      {/* Outer halo - enhanced elliptical */}
      <motion.div
        className={`absolute ${config.outerHalo} rounded-full`}
        style={{
          background: `radial-gradient(ellipse 108% 100%, rgba(76, 200, 244, ${config.outerHaloOpacity}) 0%, rgba(76, 200, 244, ${config.outerHaloOpacity * 0.5}) 40%, transparent 70%)`,
          filter: `blur(${config.outerBlur})`,
          transform: 'scale(1.08, 1)',
        }}
        animate={{
          scale: isListening ? 1.15 : 1.08,
          opacity: isListening ? [0.8, 1, 0.8] : [0.9, 1, 0.9],
        }}
        transition={{
          scale: { duration: 0.2, ease: 'easeOut' },
          opacity: { duration: isListening ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Second halo layer for depth */}
      <motion.div
        className={`absolute ${config.secondHalo} rounded-full`}
        style={{
          background: `radial-gradient(ellipse 110% 105%, rgba(76, 200, 244, ${config.secondHaloOpacity}) 0%, rgba(76, 200, 244, ${config.secondHaloOpacity * 0.5}) 40%, transparent 70%)`,
          filter: `blur(${config.secondBlur})`,
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

      {/* Thin halo ring */}
      <motion.div
        className={`absolute ${config.thinRing} rounded-full`}
        style={{
          background: 'radial-gradient(ellipse 108% 100%, transparent 70%, rgba(76, 200, 244, 0.75) 75%, transparent 80%)',
          filter: `blur(${config.thinBlur})`,
          transform: 'scale(1.08, 1)',
        }}
        animate={{
          scale: isListening ? 1.15 : 1.08,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      />

      {/* Main orb sphere - crystal gradient */}
      <motion.div
        className={`relative ${config.container} rounded-full overflow-visible`}
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95), rgba(200, 240, 255, 0.85) 45%, rgba(150, 220, 255, 0.75) 70%, rgba(76, 200, 244, 0.6))',
          boxShadow: 'inset 0 0 80px rgba(255, 255, 255, 0.4), 0 8px 32px rgba(0, 0, 0, 0.15)',
        }}
        animate={{
          scale: isProcessing ? [1, 1.015, 1] : config.breathingScale,
          scaleX: size === 'sm' ? [1, 1.04, 1, 0.96, 1] : [1, 1.025, 1, 0.975, 1],
          scaleY: size === 'sm' ? [1, 0.96, 1, 1.04, 1] : [1, 0.975, 1, 1.025, 1],
        }}
        transition={{
          scale: {
            duration: isProcessing ? 3 : 6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          scaleX: {
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          scaleY: {
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        whileHover={{
          scale: size === 'sm' ? 1.05 : 1.08,
        }}
      >
        {/* Highlight spot for 3D depth */}
        <div
          className="absolute top-[20%] left-[25%] w-[35%] h-[35%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), transparent 65%)',
            filter: 'blur(8px)',
          }}
        />
        
        {/* Inner shimmer highlight */}
        <motion.div
          className="absolute inset-[15%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(76, 200, 244, 0.3))',
            filter: 'blur(12px)',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </motion.div>
  );

  // Wrap in float animation if enabled
  // Color cycling wrapper for purple/pink/blue moments
  const colorCycledContent = (
    <motion.div
      className="relative"
      animate={{
        filter: [
          'hue-rotate(0deg)',
          'hue-rotate(15deg)',
          'hue-rotate(30deg)',
          'hue-rotate(15deg)',
          'hue-rotate(0deg)'
        ],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {orbContent}
      
      {/* Multi-color scatter dots */}
      {['#4cc8f4', '#b494ff', '#ff6db8'].map((color, i) => (
        <motion.div
          key={i}
          className={`absolute ${config.dotSize} rounded-full pointer-events-none`}
          style={{
            background: color,
            left: `${20 + i * 30}%`,
            top: `${25 + i * 20}%`,
            filter: config.dotBlur,
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );

  if (enableFloat) {
    return (
      <motion.div
        animate={{
          y: [-8, 8, -8],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {colorCycledContent}
      </motion.div>
    );
  }

  return colorCycledContent;
}
