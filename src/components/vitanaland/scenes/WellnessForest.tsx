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
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 7, ease: 'easeInOut' }}
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
