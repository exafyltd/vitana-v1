import { motion } from 'framer-motion';
import auroraLakeFar from '@/assets/vitanaland/scenes/aurora-lake-far.png';
import auroraLakeMid from '@/assets/vitanaland/scenes/aurora-lake-mid.png';

interface AuroraLakeProps {
  isActive: boolean;
}

export function AuroraLake({ isActive }: AuroraLakeProps) {
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
      {/* Far background layer - slow ethereal movement */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.06, 1],
          x: [0, -25, 0],
        } : {}}
        transition={{
          duration: 70,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={auroraLakeFar}
          alt=""
          className="w-full h-full object-cover"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Mid-ground layer - water reflection movement */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? {
          scale: [1, 1.04, 1],
          x: [0, 20, 0],
          y: [0, -10, 0],
        } : {}}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <img
          src={auroraLakeMid}
          alt=""
          className="w-full h-full object-cover opacity-85"
          style={{ willChange: 'transform' }}
        />
      </motion.div>
      
      {/* Aurora shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
