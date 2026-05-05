import { motion } from 'framer-motion';
import { Mic, MicOff, X, MonitorUp, MonitorX, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface AudioControlsProps {
  micActive: boolean;
  cameraActive: boolean;
  screenShareActive: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  onScreenShareToggle: () => void;
  onExit: () => void;
}

export function AudioControls({ 
  micActive, 
  cameraActive, 
  screenShareActive, 
  onMicToggle, 
  onCameraToggle, 
  onScreenShareToggle, 
  onExit 
}: AudioControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Exit button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onExit}
        className={cn(
          'h-14 w-14 rounded-full',
          'bg-card/80 backdrop-blur-xl border border-border/50',
          'hover:bg-card shadow-lg',
          'flex items-center justify-center',
          'transition-colors duration-200'
        )}
        aria-label={t('screens.audio.exitAudioMode')}
      >
        <X className="h-5 w-5 text-foreground" />
      </motion.button>

      {/* Mic toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onMicToggle}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          micActive
            ? 'bg-card/80 backdrop-blur-xl hover:bg-card border border-border/50'
            : 'bg-red-600 hover:bg-red-700 ring-4 ring-red-500/30'
        )}
        aria-label={micActive ? 'Mute microphone' : 'Unmute microphone'}
      >
        {micActive ? (
          <Mic className="h-5 w-5 text-foreground" />
        ) : (
          <MicOff className="h-5 w-5 text-white" />
        )}
      </motion.button>

      {/* Screen share toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onScreenShareToggle}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          screenShareActive
            ? 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-500/30'
            : 'bg-card/80 backdrop-blur-xl hover:bg-card border border-border/50'
        )}
        aria-label={screenShareActive ? 'Stop screen sharing' : 'Start screen sharing'}
      >
        {screenShareActive ? (
          <MonitorUp className="h-5 w-5 text-white" />
        ) : (
          <MonitorX className="h-5 w-5 text-foreground" />
        )}
      </motion.button>

      {/* Camera toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCameraToggle}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          cameraActive
            ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-500/30'
            : 'bg-card/80 backdrop-blur-xl hover:bg-card border border-border/50'
        )}
        aria-label={cameraActive ? 'Stop camera' : 'Start camera'}
      >
        {cameraActive ? (
          <Video className="h-5 w-5 text-white" />
        ) : (
          <VideoOff className="h-5 w-5 text-foreground" />
        )}
      </motion.button>
    </div>
  );
}
