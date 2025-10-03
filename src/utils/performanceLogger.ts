/**
 * Performance measurement utility
 * Logs operation duration with color-coded emojis based on speed
 */
export const measurePerformance = (label: string) => {
  const start = performance.now();

  return {
    end: (metadata?: any) => {
      const duration = performance.now() - start;
      
      // Color-coded based on speed
      const emoji = duration < 300 ? '⚡' : duration < 1000 ? '⏱️' : '🐢';
      
      // Log with metadata if provided
      if (metadata) {
        console.log(`${emoji} ${label}: ${duration.toFixed(0)}ms`, metadata);
      } else {
        console.log(`${emoji} ${label}: ${duration.toFixed(0)}ms`);
      }

      // Warn for slow operations (>1 second)
      if (duration > 1000) {
        console.warn(`⚠️ SLOW: ${label} took ${duration.toFixed(0)}ms`, metadata);
      }

      return duration;
    }
  };
};
