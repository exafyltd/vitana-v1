import { motion } from 'framer-motion';
import cloudIslandsFar from '@/assets/vitanaland/scenes/cloud-islands-far.png';
import cloudIslandsMid from '@/assets/vitanaland/scenes/cloud-islands-mid.png';

interface CloudIslandsProps {
  isActive: boolean;
}

export function CloudIslands({ isActive }: CloudIslandsProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 7, ease: 'easeInOut' }}
    >
      {/* Far background layer - dreamy sky drift */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.05, 1],
          x: [0, -30, 0],
        } : {}}
        transition={{
          duration: 65,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={cloudIslandsFar}
          alt=""
          className="w-full h-full object-cover"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Mid-ground layer - floating islands movement */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.08, 1],
          x: [0, 35, 0],
          y: [0, -18, 0],
        } : {}}
        transition={{
          duration: 48,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.6,
        }}
      >
        <img
          src={cloudIslandsMid}
          alt=""
          className="w-full h-full object-cover opacity-88"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Soft atmospheric glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-lavender-100/8"
        animate={{
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
