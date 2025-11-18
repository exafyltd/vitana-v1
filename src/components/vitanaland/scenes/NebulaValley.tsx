import { motion } from 'framer-motion';

interface NebulaValleyProps {
  isActive: boolean;
}

export function NebulaValley({ isActive }: NebulaValleyProps) {
  // Generate star positions
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.4,
    twinkleDelay: Math.random() * 3,
  }));

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 7, ease: 'easeInOut' }}
    >
      {/* Deep space gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(220, 25%, 15%) 0%, hsl(230, 30%, 20%) 50%, hsl(210, 35%, 25%) 100%)'
        }}
      />
      
      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.3, star.opacity],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: star.twinkleDelay,
            }}
          />
        ))}
      </div>
      
      {/* Nebula cloud 1 - Purple/Blue */}
      <motion.div
        className="absolute top-[20%] left-[10%] w-[40%] h-[35%]"
        animate={{
          rotate: [0, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(270, 70%, 50%) 0%, hsl(250, 60%, 40%) 40%, transparent 70%)',
            filter: 'blur(60px)',
            opacity: 0.35,
          }}
        />
      </motion.div>
      
      {/* Nebula cloud 2 - Cyan/Teal */}
      <motion.div
        className="absolute top-[40%] right-[15%] w-[45%] h-[40%]"
        animate={{
          rotate: [0, -8, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 55,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(190, 80%, 45%) 0%, hsl(200, 70%, 35%) 40%, transparent 70%)',
            filter: 'blur(55px)',
            opacity: 0.3,
          }}
        />
      </motion.div>
      
      {/* Nebula cloud 3 - Pink/Magenta */}
      <motion.div
        className="absolute bottom-[15%] left-[30%] w-[50%] h-[45%]"
        animate={{
          rotate: [0, 6, 0],
          scale: [1, 1.06, 1],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(320, 60%, 50%) 0%, hsl(300, 55%, 40%) 40%, transparent 70%)',
            filter: 'blur(65px)',
            opacity: 0.28,
          }}
        />
      </motion.div>
      
      {/* Dust particles overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, hsl(200, 60%, 70%) 0px, transparent 1px),
              radial-gradient(circle at 60% 70%, hsl(270, 60%, 70%) 0px, transparent 1px),
              radial-gradient(circle at 80% 20%, hsl(320, 60%, 70%) 0px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 70px 70px, 60px 60px',
            opacity: 0.3,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
