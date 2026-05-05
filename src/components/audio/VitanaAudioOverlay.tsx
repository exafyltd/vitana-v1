import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingState } from '@/context/StreamingStateContext';
// VTID-02695: ROLLBACK of useOrbVoiceUnified wire-up — useLiveKitVoice's
// livekit-client import was crashing the overlay on iOS WebView and the
// production ORB disappeared from mobile. Reverting to the original
// Vertex-only useOrbVoiceClient until the LiveKit hook is hardened
// (lazy-loaded SDK / try/catch around imports / WebRTC capability gate).
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
import { pausePersisting, resumePersisting } from '@/audio/SoundscapeAudioManager';
import { useAIConsent } from '@/hooks/useAIConsent';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

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
  const [micMuted, setMicMuted] = useState(false);

  // AI consent gate
  const { hasConsent, isLoading: consentLoading, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();
  const consentJustGrantedRef = useRef(false);

  // Toggle body attribute so CSS can suppress the ORB behind the consent dialog
  useEffect(() => {
    if (consentDialogOpen) {
      document.body.setAttribute('data-consent-dialog-open', 'true');
    } else {
      document.body.removeAttribute('data-consent-dialog-open');
    }
    return () => document.body.removeAttribute('data-consent-dialog-open');
  }, [consentDialogOpen]);
  
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
    isReconnecting,
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

  // Derived: consent is satisfied (loaded + granted, or just-granted bypass)
  const consentSatisfied = consentJustGrantedRef.current || (!consentLoading && hasConsent);

  // Clear the just-granted ref once the persisted value catches up
  useEffect(() => {
    if (hasConsent) consentJustGrantedRef.current = false;
  }, [hasConsent]);

  // Show consent dialog when overlay is open but consent not yet given
  useEffect(() => {
    if (audioOverlayVisible && !consentLoading && !hasConsent && !consentJustGrantedRef.current) {
      console.log('[VitanaAudioOverlay] No AI consent — showing consent dialog');
      setConsentDialogOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioOverlayVisible, hasConsent, consentLoading]);

  // Connect/disconnect based on overlay visibility + consent
  useEffect(() => {
    if (audioOverlayVisible && consentSatisfied) {
      console.log('[VitanaAudioOverlay] Overlay opened + consent OK — connecting...');
      setMicMuted(false);
      pausePersisting();
      connect();
    } else if (!audioOverlayVisible) {
      console.log('[VitanaAudioOverlay] Overlay closed - disconnecting...');
      resumePersisting();
      disconnect();
    }
    // When audioOverlayVisible=true but consent not yet satisfied → do nothing, wait
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioOverlayVisible, consentSatisfied]);

  // Auto-resume listening after AI finishes speaking (unless user muted).
  // Also skipped during `isReconnecting` — we don't want to flip the mic/UI
  // back to "listening" while the upstream WS is still being re-established.
  useEffect(() => {
    if (
      !isSpeaking &&
      !isProcessing &&
      !isReconnecting &&
      !micMuted &&
      connectionState === 'ready' &&
      !isListening
    ) {
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, isProcessing, isReconnecting, micMuted, connectionState, isListening]);

  // Map states to visual feedback. `reconnecting` wins over listening/idle
  // so the user never sees "I'm listening..." while the stream is down.
  const audioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'reconnecting' =
    error ? 'error' :
    isReconnecting ? 'reconnecting' :
    isSpeaking ? 'speaking' :
    isProcessing ? 'processing' :
    isListening ? 'listening' :
    connectionState === 'ready' ? 'idle' :
    'idle';

  // VitanalandPortalSeed only understands the original union — map
  // `reconnecting` to `processing` for the visual so it pulses.
  const portalAudioState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' =
    audioState === 'reconnecting' ? 'processing' : audioState;

  const errorMessage = error || undefined;

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
        notifySuccess('toasts.audio.cameraStopped');
      } else {
        setConfig(prev => ({ ...prev, enableCamera: true, enableScreen: false }));
        await startCapture();
        setCameraActive(true);
        notifySuccess('toasts.audio.cameraStarted');
      }
    } catch (error) {
      console.error('Camera toggle error:', error);
      notifyError('toasts.audio.failedToggleCamera');
    }
  };

  const handleScreenShareToggle = async () => {
    try {
      if (screenShareActive) {
        setConfig(prev => ({ ...prev, enableScreen: false }));
        stopCapture();
        setScreenShareActive(false);
        notifySuccess('toasts.audio.screenSharingStopped');
      } else {
        setConfig(prev => ({ ...prev, enableScreen: true, enableCamera: false }));
        await startCapture();
        setScreenShareActive(true);
        notifySuccess('toasts.audio.screenSharingStarted');
      }
    } catch (error) {
      console.error('Screen share toggle error:', error);
      notifyError('toasts.audio.failedToggleScreenSharing');
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
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-background/10 backdrop-blur-xl"
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
              audioState={portalAudioState}
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
                      {t('screens.audio.send')}
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

    {/* AI Data Consent Dialog - renders on top of overlay */}
    <AIDataConsentDialog
      open={consentDialogOpen}
      onOpenChange={(open) => {
        setConsentDialogOpen(open);
        // User dismissed dialog without consenting → close overlay
        if (!open && !hasConsent && !consentJustGrantedRef.current) {
          setAudioOverlayVisible(false);
        }
      }}
      onConsent={() => {
        grantConsent();
        consentJustGrantedRef.current = true;
        // No setTimeout / overlay dance — overlay is already open,
        // consentSatisfied flips to true and the connect effect fires.
      }}
    />
    </>
  );
}
