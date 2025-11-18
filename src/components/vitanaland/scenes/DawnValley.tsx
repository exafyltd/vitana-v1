import { motion } from 'framer-motion';

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
      {/* Sky gradient - Dawn colors */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(340, 100%, 95%) 0%, hsl(340, 100%, 91%) 40%, hsl(340, 85%, 87%) 100%)'
        }}
      />
      
      {/* Hills - Layer 3 (Back) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[50%]"
        animate={{
          translateY: [0, -8, 0],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <path
            d="M0,250 Q250,150 500,250 T1000,250 L1000,500 L0,500 Z"
            fill="hsl(340, 70%, 85%)"
            opacity="0.3"
          />
        </svg>
      </motion.div>
      
      {/* Hills - Layer 2 (Middle) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[60%]"
        animate={{
          translateY: [0, -12, 0],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path
            d="M0,300 Q200,200 400,300 T800,300 Q900,250 1000,300 L1000,600 L0,600 Z"
            fill="hsl(20, 100%, 88%)"
            opacity="0.35"
          />
        </svg>
      </motion.div>
      
      {/* Hills - Layer 1 (Front) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[70%]"
        animate={{
          translateY: [0, -15, 0],
        }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
          <path
            d="M0,350 Q150,250 300,350 Q450,300 600,350 Q750,280 900,350 Q950,320 1000,350 L1000,700 L0,700 Z"
            fill="hsl(270, 60%, 90%)"
            opacity="0.4"
          />
        </svg>
      </motion.div>
      
      {/* Morning mist overlay */}
      <motion.div
        className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"
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
