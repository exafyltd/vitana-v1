import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number; // 0-1 range
}

interface Particle {
  id: number;
  angle: number;
  radius: number;
  z: number;
  size: number;
  color: string;
  delay: number;
}

export function VitanalandPortalSeed({ audioState, volumeLevel }: VitanalandPortalSeedProps) {
  // Calculate dynamic values based on state and volume
  const isListening = audioState === 'listening';
  const isProcessing = audioState === 'processing';
  const isError = audioState === 'error';
  
  // Animation speed multipliers
  const flowSpeed = isListening ? 0.4 : isProcessing ? 1.2 : 0.8;
  const rippleIntensity = isListening ? volumeLevel * 0.15 : 0;
  const centralGlow = isProcessing ? 0.8 : isListening ? 0.4 + (volumeLevel * 0.3) : 0.3;

  // Generate particles in a corridor/tunnel pattern
  const particles = useMemo(() => {
    const particleArray: Particle[] = [];
    const colors = ['#4cc8f4', '#0d2cf3', '#ff6da8', '#ffffff'];
    
    // Create 80 particles arranged in a 3D corridor
    for (let i = 0; i < 80; i++) {
      const ring = Math.floor(i / 16); // 5 rings of 16 particles each
      const angleStep = (Math.PI * 2) / 16;
      const angle = (i % 16) * angleStep;
      
      particleArray.push({
        id: i,
        angle: angle,
        radius: 30 + (ring * 8), // Expand outward as we go deeper
        z: ring * 50, // Depth layers
        size: Math.max(1, 3 - ring * 0.4), // Smaller as they recede
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: i * 0.05,
      });
    }
    
    return particleArray;
  }, []);

  return (
    <div className="relative w-[160px] h-[160px] lg:w-[220px] lg:h-[220px]">
      {/* Outer atmospheric glow */}
      <motion.div
        className="absolute inset-[-30px] blur-3xl"
        style={{
          background: isError
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(76, 200, 244, 0.15) 0%, rgba(255, 109, 168, 0.08) 50%, transparent 80%)',
        }}
        animate={{
          scale: isListening ? [1, 1.08, 1] : 1,
          opacity: isListening ? [0.8, 1, 0.8] : 0.8,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 3D Particle Corridor Container */}
      <div 
        className="relative w-full h-full overflow-hidden"
        style={{
          perspective: '400px',
          perspectiveOrigin: 'center center',
        }}
      >
        {/* Central glow (processing state) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            opacity: centralGlow,
          }}
          transition={{
            duration: 0.3,
            ease: 'easeOut',
          }}
        >
          <div
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full blur-2xl"
            style={{
              background: isError
                ? 'rgba(239, 68, 68, 0.8)'
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(76, 200, 244, 0.6) 40%, transparent 80%)',
            }}
          />
        </motion.div>

        {/* Particle corridor */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {particles.map((particle) => {
              // Calculate particle depth opacity (further = more transparent)
              const depthOpacity = Math.max(0.15, 1 - (particle.z / 250));
              
              // Calculate blur based on depth (further = more blur)
              const depthBlur = particle.z > 100 ? 2 : particle.z > 50 ? 1 : 0;

              return (
                <motion.div
                  key={particle.id}
                  className="absolute rounded-full"
                  style={{
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    backgroundColor: particle.color,
                    boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
                    filter: `blur(${depthBlur}px)`,
                    opacity: depthOpacity,
                    left: '50%',
                    top: '50%',
                    transformStyle: 'preserve-3d',
                  }}
                  animate={{
                    x: [
                      Math.cos(particle.angle + rippleIntensity) * particle.radius,
                      Math.cos(particle.angle + rippleIntensity) * (particle.radius * 0.5),
                    ],
                    y: [
                      Math.sin(particle.angle + rippleIntensity) * particle.radius,
                      Math.sin(particle.angle + rippleIntensity) * (particle.radius * 0.5),
                    ],
                    z: [particle.z, -50], // Move toward viewer
                    scale: [1, 1.8], // Grow as they approach
                  }}
                  transition={{
                    duration: 3 * flowSpeed,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: particle.delay,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Depth of field gradient (foreground fade) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 80%)',
          }}
        />

        {/* Listening ripple overlay */}
        {isListening && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(76, 200, 244, 0.2) 0%, transparent 60%)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6 + (volumeLevel * 0.4), 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Error overlay */}
        {isError && (
          <motion.div
            className="absolute inset-0 bg-red-500/15 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {/* Soft bloom effect */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(76, 200, 244, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  );
}
