import { motion } from 'framer-motion';

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
      {/* Sky gradient - Soft blue sky */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(210, 65%, 96%) 0%, hsl(205, 60%, 94%) 50%, hsl(200, 55%, 90%) 100%)'
        }}
      />
      
      {/* Cloud island - Back */}
      <motion.div
        className="absolute top-[25%] right-[10%]"
        animate={{
          translateY: [0, -15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg width="180" height="100" viewBox="0 0 180 100">
          <ellipse cx="90" cy="60" rx="80" ry="35" fill="hsl(200, 40%, 88%)" opacity="0.4" />
          <ellipse cx="90" cy="50" rx="70" ry="30" fill="hsl(205, 45%, 90%)" opacity="0.5" />
        </svg>
        {/* Shadow */}
        <div
          className="absolute -bottom-8 left-[10%] w-[80%] h-4 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(200, 30%, 75%) 0%, transparent 70%)',
            filter: 'blur(8px)',
            opacity: 0.2,
          }}
        />
      </motion.div>
      
      {/* Cloud island - Middle left */}
      <motion.div
        className="absolute top-[40%] left-[15%]"
        animate={{
          translateY: [0, -18, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <svg width="220" height="120" viewBox="0 0 220 120">
          <ellipse cx="110" cy="70" rx="100" ry="40" fill="hsl(205, 42%, 86%)" opacity="0.45" />
          <ellipse cx="110" cy="58" rx="85" ry="35" fill="hsl(210, 48%, 88%)" opacity="0.55" />
        </svg>
        <div
          className="absolute -bottom-10 left-[12%] w-[76%] h-5 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(205, 32%, 73%) 0%, transparent 70%)',
            filter: 'blur(10px)',
            opacity: 0.22,
          }}
        />
      </motion.div>
      
      {/* Cloud island - Front center */}
      <motion.div
        className="absolute top-[55%] left-[50%]"
        style={{ transform: 'translateX(-50%)' }}
        animate={{
          translateY: [0, -20, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <svg width="260" height="140" viewBox="0 0 260 140">
          <ellipse cx="130" cy="80" rx="120" ry="45" fill="hsl(210, 40%, 84%)" opacity="0.5" />
          <ellipse cx="130" cy="65" rx="100" ry="40" fill="hsl(205, 50%, 86%)" opacity="0.6" />
        </svg>
        <div
          className="absolute -bottom-12 left-[15%] w-[70%] h-6 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(210, 35%, 70%) 0%, transparent 70%)',
            filter: 'blur(12px)',
            opacity: 0.25,
          }}
        />
      </motion.div>
      
      {/* Cloud island - Small right */}
      <motion.div
        className="absolute top-[65%] right-[20%]"
        animate={{
          translateY: [0, -12, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
      >
        <svg width="160" height="90" viewBox="0 0 160 90">
          <ellipse cx="80" cy="55" rx="70" ry="30" fill="hsl(200, 38%, 87%)" opacity="0.45" />
          <ellipse cx="80" cy="45" rx="60" ry="25" fill="hsl(205, 44%, 89%)" opacity="0.5" />
        </svg>
        <div
          className="absolute -bottom-6 left-[18%] w-[64%] h-3 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(200, 32%, 76%) 0%, transparent 70%)',
            filter: 'blur(6px)',
            opacity: 0.18,
          }}
        />
      </motion.div>
      
      {/* Atmospheric haze */}
      <motion.div
        className="absolute inset-0 bg-white/15"
        animate={{
          opacity: [0.15, 0.25, 0.15],
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
