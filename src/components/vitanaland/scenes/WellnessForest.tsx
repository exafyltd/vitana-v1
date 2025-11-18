import { motion } from 'framer-motion';

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
      {/* Sky gradient - Forest greens */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(100, 45%, 92%) 0%, hsl(120, 40%, 88%) 60%, hsl(130, 38%, 84%) 100%)'
        }}
      />
      
      {/* Tree silhouettes - Back layer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[65%]"
        animate={{
          scale: [1, 1.01, 1],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 650" preserveAspectRatio="none">
          {/* Tree shapes */}
          <ellipse cx="200" cy="450" rx="80" ry="200" fill="hsl(130, 35%, 75%)" opacity="0.3" />
          <ellipse cx="500" cy="400" rx="100" ry="250" fill="hsl(125, 38%, 72%)" opacity="0.3" />
          <ellipse cx="800" cy="480" rx="90" ry="180" fill="hsl(135, 32%, 78%)" opacity="0.3" />
        </svg>
      </motion.div>
      
      {/* Tree silhouettes - Middle layer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[70%]"
        animate={{
          scale: [1, 1.015, 1],
        }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
          <ellipse cx="350" cy="500" rx="110" ry="240" fill="hsl(125, 40%, 70%)" opacity="0.35" />
          <ellipse cx="650" cy="450" rx="95" ry="260" fill="hsl(130, 42%, 68%)" opacity="0.35" />
        </svg>
      </motion.div>
      
      {/* Tree silhouettes - Front layer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[75%]"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 750" preserveAspectRatio="none">
          <ellipse cx="150" cy="550" rx="120" ry="280" fill="hsl(130, 45%, 65%)" opacity="0.4" />
          <ellipse cx="900" cy="520" rx="105" ry="250" fill="hsl(125, 43%, 67%)" opacity="0.4" />
        </svg>
      </motion.div>
      
      {/* Dappled light effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute top-[30%] left-[20%] w-[15%] h-[25%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(60, 100%, 90%) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        <div
          className="absolute top-[45%] right-[25%] w-[18%] h-[22%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(55, 100%, 88%) 0%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}
