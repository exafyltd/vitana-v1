import { motion } from 'framer-motion';
import nebulaValleyFar from '@/assets/vitanaland/scenes/nebula-valley-far.png';
import nebulaValleyMid from '@/assets/vitanaland/scenes/nebula-valley-mid.png';

interface NebulaValleyProps {
  isActive: boolean;
}

export function NebulaValley({ isActive }: NebulaValleyProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 1.15,
        x: isActive ? 0 : -30,
      }}
      transition={{ 
        duration: 15, 
        ease: 'easeInOut',
        scale: { duration: 15 },
        x: { duration: 15 }
      }}
    >
      {/* Far background layer - cosmic depth */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.07, 1],
          x: [0, -18, 0],
        } : {}}
        transition={{
          duration: 75,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={nebulaValleyFar}
          alt=""
          className="w-full h-full object-cover"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Mid-ground layer - nebula wisps */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.05, 1],
          x: [0, 28, 0],
          y: [0, -14, 0],
        } : {}}
        transition={{
          duration: 52,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.2,
        }}
      >
        <img
          src={nebulaValleyMid}
          alt=""
          className="w-full h-full object-cover opacity-82"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Cosmic shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent"
        animate={{
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
