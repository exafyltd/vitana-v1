import { motion } from 'framer-motion';
import wellnessForestFar from '@/assets/vitanaland/scenes/wellness-forest-far.png';
import wellnessForestMid from '@/assets/vitanaland/scenes/wellness-forest-mid.png';

interface WellnessForestProps {
  isActive: boolean;
}

export function WellnessForest({ isActive }: WellnessForestProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 1, scale: 1.2, x: 60 }}
      animate={{ 
        opacity: 1,
        scale: isActive ? 1 : 1.3,
        x: isActive ? 0 : -80,
        zIndex: isActive ? 20 : 10,
      }}
      transition={{ 
        duration: 15,
        ease: [0.45, 0.05, 0.15, 0.95],
        scale: { duration: 15 },
        x: { duration: 15 },
        zIndex: { duration: 0, delay: isActive ? 0 : 8 },
      }}
    >
      {/* Far background layer - gentle forest depth */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.04, 1],
          x: [0, -15, 0],
        } : {}}
        transition={{
          duration: 55,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={wellnessForestFar}
          alt=""
          className="w-full h-full object-cover"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Mid-ground layer - closer tree movement */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.07, 1],
          x: [0, 25, 0],
          y: [0, -12, 0],
        } : {}}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.8,
        }}
      >
        <img
          src={wellnessForestMid}
          alt=""
          className="w-full h-full object-cover opacity-90"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Dappled light effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-yellow-100/10 via-transparent to-transparent"
        animate={{
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
