import { motion } from 'framer-motion';
import dawnValleyFar from '@/assets/vitanaland/scenes/dawn-valley-far.png';
import dawnValleyMid from '@/assets/vitanaland/scenes/dawn-valley-mid.png';

interface DawnValleyProps {
  isActive: boolean;
}

export function DawnValley({ isActive }: DawnValleyProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 7, ease: 'easeInOut' }}
    >
      {/* Far background layer - slower parallax with gentle zoom */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.05, 1],
          x: [0, -20, 0],
        } : {}}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={dawnValleyFar}
          alt=""
          className="w-full h-full object-cover"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Mid-ground layer - faster parallax movement */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.08, 1],
          x: [0, 30, 0],
          y: [0, -15, 0],
        } : {}}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <img
          src={dawnValleyMid}
          alt=""
          className="w-full h-full object-cover opacity-90"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Soft atmospheric overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/5"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
