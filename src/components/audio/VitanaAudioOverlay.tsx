import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useVitanalandLive } from '@/hooks/useVitanalandLive';
import { useVitanaOrbTools } from '@/hooks/useVitanaOrbTools';
import { useVitanaPCMAudio } from '@/hooks/useVitanaPCMAudio';
import { useVisualContext } from '@/hooks/useVisualContext';
import { VitanalandPortalSeed } from './VitanalandPortalSeed';
import { AudioControls } from './AudioControls';
import { AudioStatusText } from './AudioStatusText';
import { VitanaOrbStatusBar } from '@/components/vitanaland/VitanaOrbStatusBar';
import { DiaryQuickEntry } from '@/components/diary/DiaryQuickEntry';
import { AutopilotPopup } from '@/components/AutopilotPopup';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export function VitanaAudioOverlay() {
  const { 
    audioOverlayVisible, 
    setAudioOverlayVisible, 
    cameraActive,
    setCameraActive,
    screenShareActive,
    setScreenShareActive,
    diaryActive, 
    setDiaryActive,
    autopilotActive,
    setAutopilotActive,
    textInputVisible,
    setTextInputVisible,
  } = useStreamingState();
  
  const [textInputValue, setTextInputValue] = useState('');
  const [showDiaryEntry, setShowDiaryEntry] = useState(false);
  const [showAutopilot, setShowAutopilot] = useState(false);
  
  // Visual context for screen/camera sharing
  const { 
    startCapture, 
    stopCapture, 
    setConfig 
  } = useVisualContext();
  
  const {
    connectionState,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    setAudioResponseHandler,
    setAudioStartHandler,
    setAudioEndHandler,
  } = useVitanalandLive();

  // Audio playback system
  const { playAudio, stopAudio, cleanup: cleanupAudio } = useVitanaPCMAudio();

  // Handle tool execution and navigation
  const { executeToolCall, navigateByCommand } = useVitanaOrbTools({
    onDiaryOpen: () => setShowDiaryEntry(true),
    onAutopilotOpen: () => setShowAutopilot(true),
  });

  const volumeLevel = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Set up audio handlers
  useEffect(() => {
    setAudioResponseHandler((blob) => {
      console.log('[VITANALAND] Playing audio response');
      playAudio(blob);
    });

    setAudioStartHandler(() => {
      console.log('[VITANALAND] Audio playback started');
    });

    setAudioEndHandler(() => {
      console.log('[VITANALAND] Audio playback ended');
    });
  }, [setAudioResponseHandler, setAudioStartHandler, setAudioEndHandler, playAudio]);

  // Connect/disconnect based on overlay visibility
  useEffect(() => {
    if (audioOverlayVisible) {
      console.log('[VITANALAND] Overlay opened - connecting...');
      connect(executeToolCall);
    } else {
      console.log('[VITANALAND] Overlay closed - disconnecting...');
      stopAudio();
      disconnect();
      cleanupAudio();
    }
  }, [audioOverlayVisible, connect, disconnect, executeToolCall, stopAudio, cleanupAudio]);

  // Map VITANALAND states to visual feedback
  const audioState: 'idle' | 'listening' | 'processing' | 'error' = 
    error ? 'error' :
    isSpeaking ? 'processing' :
    isProcessing ? 'processing' :
    isListening ? 'listening' :
    connectionState === 'ready' ? 'idle' :
    'idle';
  
  const errorMessage = error || undefined;

  // Get connection status message
  const getConnectionStatus = () => {
    if (error) return error;
    if (isSpeaking) return 'VITANA is speaking...';
    if (isProcessing) return 'Thinking...';
    if (isListening) return "I'm listening...";
    if (connectionState === 'connecting') return 'Setting up AI connection...';
    if (connectionState === 'ready' && !isSpeaking && !isListening) return 'Ready - say something or press the mic';
    if (connectionState === 'disconnected') return 'Connection lost — tap the orb to reconnect';
    return 'Connecting...';
  };

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
    setTextInputVisible(false);
    setDiaryActive(false);
    setAutopilotActive(false);
  };

  const handleMicToggle = async () => {
    console.log('[VITANALAND] Mic toggle - current state:', { isListening, connectionState });
    
    // Only prevent mic toggle if completely disconnected
    if (connectionState === 'disconnected') {
      console.warn('[VITANALAND] Cannot toggle mic - disconnected');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleCameraToggle = async () => {
    try {
      if (cameraActive) {
        setConfig(prev => ({ ...prev, enableCamera: false }));
        stopCapture();
        setCameraActive(false);
        toast.success('Camera stopped');
      } else {
        setConfig(prev => ({ ...prev, enableCamera: true, enableScreen: false }));
        await startCapture();
        setCameraActive(true);
        toast.success('Camera started');
      }
    } catch (error) {
      console.error('Camera toggle error:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const handleScreenShareToggle = async () => {
    try {
      if (screenShareActive) {
        setConfig(prev => ({ ...prev, enableScreen: false }));
        stopCapture();
        setScreenShareActive(false);
        toast.success('Screen sharing stopped');
      } else {
        setConfig(prev => ({ ...prev, enableScreen: true, enableCamera: false }));
        await startCapture();
        setScreenShareActive(true);
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Screen share toggle error:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  const handleTextSubmit = () => {
    if (!textInputValue.trim()) return;
    
    // Try navigation first
    if (navigateByCommand(textInputValue)) {
      setTextInputValue('');
      return;
    }
    
    // Otherwise send to AI
    sendMessage(textInputValue);
    setTextInputValue('');
  };

  const handleDiaryClose = () => {
    setShowDiaryEntry(false);
    setDiaryActive(false);
  };

  const handleAutopilotClose = () => {
    setShowAutopilot(false);
    setAutopilotActive(false);
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
          {/* Status Bar - Active Modes */}
          <div className="absolute top-8">
            <VitanaOrbStatusBar />
          </div>

          {/* Portal Seed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <VitanalandPortalSeed 
              audioState={audioState} 
              volumeLevel={volumeLevel.current}
              size="lg"
              layoutId="vitana-orb"
            />
          </motion.div>

          {/* Status text */}
          <AudioStatusText audioState={audioState} errorMessage={errorMessage} />

          {/* Text Input Area - Slides up from bottom */}
          <AnimatePresence>
            {textInputVisible && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-4"
              >
                <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/50 shadow-2xl">
                  <Textarea
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[80px] resize-none bg-transparent border-0 focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSubmit();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTextInputVisible(false)}
                      className="text-xs text-muted-foreground"
                    >
                      Return to voice
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleTextSubmit}
                      disabled={!textInputValue.trim()}
                      className="gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              cameraActive={cameraActive}
              screenShareActive={screenShareActive}
              onMicToggle={handleMicToggle}
              onCameraToggle={handleCameraToggle}
              onScreenShareToggle={handleScreenShareToggle}
              onExit={handleExit}
            />
          </motion.div>
        </div>

        {/* Modals */}
        <DiaryQuickEntry
          open={showDiaryEntry}
          onClose={handleDiaryClose}
        />
        <AutopilotPopup
          open={showAutopilot}
          onOpenChange={(open) => {
            setShowAutopilot(open);
            if (!open) setAutopilotActive(false);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
