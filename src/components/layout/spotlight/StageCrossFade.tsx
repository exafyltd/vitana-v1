import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * VTID-05105 — 150 ms fade of the stage content when a screen appears
 * (contract SR-22). No movement, no shared elements; nothing at all under
 * `prefers-reduced-motion`.
 */
export function StageCrossFade({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  if (reduce) return <>{children}</>;
  return (
    <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
