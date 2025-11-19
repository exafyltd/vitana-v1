import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStreamingState } from '@/context/StreamingStateContext';
import { playSound } from '@/lib/playSound';
import { playLoopingSound } from '@/lib/playLoopingSound';

export function CentralGuideOrb() {
  const { micActive } = useStreamingState();
  const humRef = useRef<HTMLAudioElement | null>(null);
  const prevMicActiveRef = useRef(micActive);

  // Handle sound effects based on mic state
  useEffect(() => {
    // When mic becomes active (listening starts)
    if (micActive && !prevMicActiveRef.current) {
      playSound("/sounds/vitanaland/listening-shimmer.mp3", 0.10);
      
      // Start thinking hum (will be used when thinking state is implemented)
      if (!humRef.current) {
        humRef.current = playLoopingSound("/sounds/vitanaland/thinking-hum.mp3", 0.03);
      }
    }
    
    // When mic becomes inactive (listening stops)
    if (!micActive && prevMicActiveRef.current) {
      // Stop thinking hum
      if (humRef.current) {
        humRef.current.pause();
        humRef.current = null;
      }
    }
    
    prevMicActiveRef.current = micActive;
  }, [micActive]);

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: 100 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Float animation wrapper */}
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
        <div className="relative w-[120px] h-[120px] lg:w-[140px] lg:h-[140px]">
          {/* Outer halo - enhanced elliptical */}
          <motion.div
            className="absolute inset-[-20px] lg:inset-[-25px] rounded-full"
            style={{
              background: 'radial-gradient(ellipse 108% 100%, rgba(76, 200, 244, 0.4) 0%, rgba(76, 200, 244, 0.2) 40%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.08, 1)',
            }}
            animate={{
              scale: micActive ? 1.15 : 1.08,
              opacity: micActive ? [0.8, 1, 0.8] : [0.9, 1, 0.9],
            }}
            transition={{
              scale: { duration: 0.2, ease: 'easeOut' },
              opacity: { duration: micActive ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Second halo layer for depth */}
          <motion.div
            className="absolute inset-[-23px] lg:inset-[-28px] rounded-full"
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

          {/* Thin halo ring */}
          <motion.div
            className="absolute inset-[-10px] lg:inset-[-12px] rounded-full"
            style={{
              background: 'radial-gradient(ellipse 108% 100%, transparent 70%, rgba(76, 200, 244, 0.75) 75%, transparent 80%)',
              filter: 'blur(1.5px)',
              transform: 'scale(1.08, 1)',
            }}
            animate={{
              scale: micActive ? 1.15 : 1.08,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
          />

          {/* Main sphere container with shape morphing */}
          <motion.div
            className="relative w-full h-full rounded-full overflow-visible"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95), rgba(200, 240, 255, 0.85) 45%, rgba(150, 220, 255, 0.75) 70%, rgba(76, 200, 244, 0.6))',
              boxShadow: 'inset 0 0 80px rgba(255, 255, 255, 0.4), 0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
            animate={{
              scale: micActive ? [1, 1.06, 1] : [1, 1.03, 1],
              scaleX: [1, 1.015, 1, 0.985, 1],
              scaleY: [1, 0.985, 1, 1.015, 1],
            }}
            transition={{
              scale: {
                duration: micActive ? 1.5 : 4,
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
          >
            {/* Inner glow core */}
            <motion.div
              className="absolute inset-[15%] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(76, 200, 244, 0.3))',
                filter: 'blur(12px)',
              }}
              animate={{
                opacity: micActive ? [0.7, 0.95, 0.7] : [0.6, 0.8, 0.6],
              }}
              transition={{
                duration: micActive ? 1 : 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Highlight spot */}
            <div
              className="absolute top-[20%] left-[25%] w-[35%] h-[35%] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), transparent 65%)',
                filter: 'blur(8px)',
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
