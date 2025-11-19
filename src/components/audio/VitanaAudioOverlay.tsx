import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useVitanalandLive } from '@/hooks/useVitanalandLive';
import { VitanalandPortalSeed } from './VitanalandPortalSeed';
import { AudioControls } from './AudioControls';
import { AudioStatusText } from './AudioStatusText';

export function VitanaAudioOverlay() {
  const { audioOverlayVisible, setAudioOverlayVisible } = useStreamingState();
  
  const {
    connectionState,
    isListening,
    isProcessing,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
  } = useVitanalandLive();

  const volumeLevel = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Connect/disconnect based on overlay visibility
  useEffect(() => {
    if (audioOverlayVisible) {
      console.log('[VITANALAND] Overlay opened - connecting...');
      connect();
    } else {
      console.log('[VITANALAND] Overlay closed - disconnecting...');
      disconnect();
    }
  }, [audioOverlayVisible, connect, disconnect]);

  // Map VITANALAND states to visual feedback
  const audioState: 'idle' | 'listening' | 'processing' | 'error' = 
    error ? 'error' :
    isProcessing ? 'processing' :
    isListening ? 'listening' :
    connectionState === 'ready' ? 'idle' :
    'idle';
  
  const errorMessage = error || undefined;

  // Set up real-time volume monitoring when listening
  useEffect(() => {
    if (!audioOverlayVisible || !isListening) {
      // Clean up audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      volumeLevel.current = 0;
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedVolume = Math.min(average / 128, 1);

          volumeLevel.current = normalizedVolume;
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      } catch (error) {
        console.error('Failed to setup audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
      audioContextRef.current.close();
      }
    };
  }, [audioOverlayVisible, isListening]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && audioOverlayVisible) {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioOverlayVisible]);

  const handleExit = () => {
    setAudioOverlayVisible(false);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!audioOverlayVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100]"
        role="dialog"
        aria-label="VITANA Audio Mode"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Subtle radial gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(13, 44, 243, 0.02) 0%, rgba(255, 109, 168, 0.01) 50%, transparent 100%)',
          }}
        />

        {/* Content container */}
        <div className="relative h-full flex flex-col items-center justify-center">
          {/* Portal Seed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <VitanalandPortalSeed audioState={audioState} volumeLevel={volumeLevel.current} />
          </motion.div>

          {/* Status text */}
          <AudioStatusText audioState={audioState} errorMessage={errorMessage} />

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="absolute bottom-16 lg:bottom-20"
          >
            <AudioControls
              micActive={isListening}
              onMicToggle={handleMicToggle}
              onExit={handleExit}
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
