import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, Monitor, BookText, Plane } from 'lucide-react';
import { useStreamingState } from '@/context/StreamingStateContext';

export function VitanaOrbStatusBar() {
  const { glassModeActive, cameraActive, diaryActive, autopilotActive } = useStreamingState();

  const statuses = [
    { 
      id: 'screen', 
      active: glassModeActive, 
      icon: Monitor, 
      label: 'Screen', 
      color: 'text-blue-400'
    },
    { 
      id: 'camera', 
      active: cameraActive, 
      icon: Camera, 
      label: 'Camera', 
      color: 'text-green-400'
    },
    { 
      id: 'diary', 
      active: diaryActive, 
      icon: BookText, 
      label: 'Diary', 
      color: 'text-purple-400'
    },
    { 
      id: 'autopilot', 
      active: autopilotActive, 
      icon: Plane, 
      label: 'Autopilot', 
      color: 'text-amber-400'
    },
  ].filter(status => status.active);

  if (statuses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 mb-6"
    >
      <AnimatePresence mode="popLayout">
        {statuses.map((status) => (
          <motion.div
            key={status.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg"
          >
            <status.icon className={`h-3.5 w-3.5 ${status.color}`} />
            <span className="text-xs font-medium text-foreground">{status.label}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
