import { motion } from 'framer-motion';

interface AuroraLakeProps {
  isActive: boolean;
}

export function AuroraLake({ isActive }: AuroraLakeProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 7, ease: 'easeInOut' }}
    >
      {/* Sky gradient - Aurora blue tones */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(180, 70%, 92%) 0%, hsl(195, 60%, 88%) 50%, hsl(190, 55%, 85%) 100%)'
        }}
      />
      
      {/* Water reflection layer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[55%]"
        animate={{
          scaleY: [1, 1.02, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(180deg, hsl(190, 55%, 80%) 0%, hsl(195, 60%, 75%) 100%)',
            opacity: 0.4,
          }}
        />
      </motion.div>
      
      {/* Aurora streaks - Layer 1 */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        animate={{
          translateX: ['-10%', '10%', '-10%'],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute top-[20%] left-0 right-0 h-[30%]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(190, 100%, 70%) 50%, transparent 100%)',
            filter: 'blur(40px)',
            opacity: 0.4,
          }}
        />
      </motion.div>
      
      {/* Aurora streaks - Layer 2 */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        animate={{
          translateX: ['10%', '-10%', '10%'],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute top-[35%] left-0 right-0 h-[25%]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(270, 70%, 75%) 50%, transparent 100%)',
            filter: 'blur(35px)',
            opacity: 0.35,
          }}
        />
      </motion.div>
      
      {/* Ripple effect overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute bottom-0 w-full h-[40%]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 10px, hsl(190, 50%, 80%) 10px, hsl(190, 50%, 80%) 11px)',
            opacity: 0.15,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
