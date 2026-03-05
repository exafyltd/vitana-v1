import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useOrbVoiceClient } from '@/hooks/useOrbVoiceClient';
import { useVitanaOrbTools } from '@/hooks/useVitanaOrbTools';
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
import { pausePersisting, resumePersisting } from '@/audio/SoundscapeAudioManager';

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
  const [micMuted, setMicMuted] = useState(false); // User-controlled mute state
  
  // Visual context for screen/camera sharing (preserved for future multimodal)
  const { 
    startCapture, 
    stopCapture, 
    setConfig 
  } = useVisualContext();
  
  // New REST + SSE based voice client
  const {
    connectionState,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    volumeLevel,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
  } = useOrbVoiceClient();

  // Handle tool execution and navigation
  const { navigateByCommand } = useVitanaOrbTools({
    onDiaryOpen: () => setShowDiaryEntry(true),
    onAutopilotOpen: () => setShowAutopilot(true),
  });

  // Connect/disconnect based on overlay visibility
  // connect/disconnect are stable refs — only audioOverlayVisible triggers this
  useEffect(() => {
    if (audioOverlayVisible) {
      console.log('[VitanaAudioOverlay] Overlay opened - connecting...');
      setMicMuted(false); // Always start with open mic
      pausePersisting(); // Stop soundscape I/O during voice session
      connect();
    } else {
      console.log('[VitanaAudioOverlay] Overlay closed - disconnecting...');
      resumePersisting(); // Restore soundscape persistence
      disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioOverlayVisible]);

  // Auto-resume listening after AI finishes speaking (unless user muted)
  useEffect(() => {
    if (!isSpeaking && !isProcessing && !micMuted && connectionState === 'ready' && !isListening) {
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, isProcessing, micMuted, connectionState, isListening]);

  // UI-level safety timeout: if stuck in "processing" for 20s, force-reset
  useEffect(() => {
    if (!isProcessing) return;
    const safetyTimer = setTimeout(() => {
      console.warn('[VitanaAudioOverlay] UI safety timeout — stuck in processing for 20s, force-resetting');
      // The hook doesn't expose a direct reset, but stopping+starting listening
      // will trigger the auto-resume effect above
      stopListening();
      setTimeout(() => {
        if (connectionState === 'ready' && !micMuted) {
          startListening();
        }
      }, 200);
    }, 20000);
    return () => clearTimeout(safetyTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Map states to visual feedback
  const audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' = 
    error ? 'error' :
    isSpeaking ? 'speaking' :
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
    console.log('[VitanaAudioOverlay] Mic toggle - current micMuted:', micMuted, 'isListening:', isListening);
    
    // Only prevent mic toggle if completely disconnected
    if (connectionState === 'disconnected') {
      console.warn('[VitanaAudioOverlay] Cannot toggle mic - disconnected');
      return;
    }

    if (!micMuted) {
      // User wants to mute — stop the recorder
      stopListening();
      setMicMuted(true);
    } else {
      // User wants to unmute — restart the recorder
      await startListening();
      setMicMuted(false);
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
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl"
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
              volumeLevel={volumeLevel}
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
              micActive={!micMuted}
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
