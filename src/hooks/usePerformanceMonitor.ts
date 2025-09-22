import { useRef, useCallback } from 'react';

export function usePerformanceMonitor() {
  const timers = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((label: string) => {
    timers.current.set(label, performance.now());
    console.log(`⏱️ Started timer: ${label}`);
  }, []);

  const endTimer = useCallback((label: string, logThreshold = 1000) => {
    const startTime = timers.current.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      timers.current.delete(label);
      
      if (duration > logThreshold) {
        console.warn(`🐌 Slow operation: ${label} took ${duration.toFixed(2)}ms (threshold: ${logThreshold}ms)`);
      } else {
        console.log(`✅ ${label} completed in ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    console.warn(`⚠️ Timer '${label}' not found`);
    return 0;
  }, []);

  const measureAsync = useCallback(async <T>(
    label: string,
    operation: () => Promise<T>,
    logThreshold = 1000
  ): Promise<T> => {
    startTimer(label);
    try {
      const result = await operation();
      endTimer(label, logThreshold);
      return result;
    } catch (error) {
      endTimer(label, logThreshold);
      throw error;
    }
  }, [startTimer, endTimer]);

  return {
    startTimer,
    endTimer,
    measureAsync
  };
}