import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react"
import { Mic, MicOff, Video as VideoIcon, X, Send, Plane, Globe, Monitor, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import DiaryButton from "@/components/diary/DiaryButton"
import { aiVoiceService } from "@/services/aiVoiceService"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useLanguage } from "@/contexts/LanguageContext"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { useVertexLive } from "@/hooks/useVertexLive"
import { useProactiveAssistant } from "@/hooks/useProactiveAssistant"
import { ClientSTT } from "@/utils/clientSTT"
import { useErrorNotifications } from "@/hooks/useErrorNotifications"
import { ErrorNotificationStack } from "@/components/ErrorNotificationStack"
import { useGlassMode } from "@/hooks/useGlassMode"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface StreamingChatRef {
  activateVideo: () => void
  deactivateVideo: () => void
  isStreamingActive: () => boolean // returns true when video is active
}

export const StreamingChat = forwardRef<StreamingChatRef>((props, ref) => {
  const [isAudioActive, setIsAudioActive] = useState(false)
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [streamTime] = useState("9:51")
  const [inputValue, setInputValue] = useState("")
  const [assistantStreamingText, setAssistantStreamingText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCrisisButton, setShowCrisisButton] = useState(false)
  const [useVertexLiveMode, setUseVertexLiveMode] = useState(true)
  const [isAutopilotProcessing, setIsAutopilotProcessing] = useState(false)
  const [cameraFramesSent, setCameraFramesSent] = useState(false)
  const fadeTimeoutRef = useRef<NodeJS.Timeout>()

  const { selectedLanguage, setSelectedLanguage, languageOptions, isLoading: languageLoading } = useLanguage()
  const { toast } = useToast()
  const { preferences } = useUserPreferences()
  const { triggerProactiveMessage, isGenerating: isGeneratingMessage } = useProactiveAssistant()
  const { errors, showError, dismissError } = useErrorNotifications()
  
  // Glass Mode integration
  const {
    isActive: glassModeActive,
    hasAudioTrack: glassModeHasAudio,
    isAudioMuted: glassModeAudioMuted,
    screenContext: glassModeContext,
    startGlassMode,
    stopGlassMode,
    toggleAudioMute: glassModeToggleAudio,
    setOnOverviewFrame: glassModeSetOnOverview,
    setOnRoiFrame: glassModeSetOnRoi,
    setOnContextUpdate: glassModeSetOnContext,
    setOnTextSnippet: glassModeSetOnTextSnippet,
  } = useGlassMode()
  
  // Vertex Live API integration
  const {
    isConnected: vertexConnected,
    isGeminiReady: vertexIsGeminiReady,
    isConnecting: vertexConnecting,
    isError: vertexIsError,
    connectionState: vertexConnectionState,
    isRecording: vertexRecording,
    isScreenSharing: vertexScreenSharing,
    isCameraActive: vertexCameraActive,
    isMuted: vertexIsMuted,
    transcript: vertexTranscript,
    error: vertexError,
    micTemporarilyDisabled: vertexMicDisabled,
    connect: vertexConnect,
    disconnect: vertexDisconnect,
    startAudio: vertexStartAudio,
    stopAudio: vertexStopAudio,
    startScreen: vertexStartScreen,
    stopScreen: vertexStopScreen,
    startCamera: vertexStartCamera,
    stopCamera: vertexStopCamera,
    sendText: vertexSendText,
    sendVideoFrame: vertexSendVideoFrame,
    toggleMute: vertexToggleMute,
    setOnResponseComplete: vertexSetOnResponseComplete,
  } = useVertexLive()
  
  // Wire up autopilot response complete callback
  useEffect(() => {
    vertexSetOnResponseComplete(() => {
      console.log('[AUTOPILOT] ✅ Response complete, resetting button')
      setIsAutopilotProcessing(false)
    })
  }, [vertexSetOnResponseComplete])
  
  // Wire Glass Mode to Vertex Live
  useEffect(() => {
    if (!glassModeActive) return;
    
    // Send overview frames to Vertex
    glassModeSetOnOverview((data) => {
      if (vertexConnected) {
        console.log('📸 Overview frame captured, sending to Vertex');
        // Send overview frame (lower priority, lower resolution)
        vertexSendVideoFrame(data, "image/jpeg");
      }
    });
    
    // Send ROI frames to Vertex (priority)
    glassModeSetOnRoi((data) => {
      if (vertexConnected) {
        console.log('🎯 ROI frame captured, sending to Vertex');
        // Send ROI frame (higher priority, focused on cursor area)
        vertexSendVideoFrame(data, "image/jpeg");
      }
    });
    
    // Send context updates
    glassModeSetOnContext((context) => {
      if (vertexConnected) {
        console.log('📊 Context update:', context);
        // Send screen context as structured text
        const contextText = `[Screen Context] Cursor: (${context.cursorX}, ${context.cursorY}), Viewport: ${context.viewportWidth}x${context.viewportHeight}, Zoom: ${context.zoom}, Scroll: (${context.scrollX}, ${context.scrollY})`;
        vertexSendText(contextText);
      }
    });
    
    // Send text snippets
    glassModeSetOnTextSnippet((text) => {
      if (vertexConnected) {
        // Send text snippet
        console.log('📝 Text snippet:', text.substring(0, 50) + '...');
        vertexSendText(`[Screen Selection] ${text}`);
      }
    });
  }, [glassModeActive, vertexConnected, glassModeSetOnOverview, glassModeSetOnRoi, glassModeSetOnContext, glassModeSetOnTextSnippet, vertexSendText, vertexSendVideoFrame])

  const isStreaming = isAudioActive || isVideoActive

  // Pre-warm user context cache on component mount
  useEffect(() => {
    const prewarmCache = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.functions.invoke('fetch-user-context', {
            body: { userId: user.id, forceRefresh: false }
          });
          console.log('✅ Context cache pre-warmed');
        }
      } catch (error) {
        console.log('Context cache pre-warm failed (non-critical):', error);
      }
    };
    prewarmCache();
  }, []);

  const handleClose = () => {
    setIsAudioActive(false)
    setIsVideoActive(false)
  }

  const handleMicToggle = async () => {
    console.log('[MIC] 🎤 Mic clicked', { vertexRecording, isRecording, vertexCameraActive, vertexScreenSharing });
    
    // STOP if currently recording
    if (vertexRecording || isRecording) {
      console.log('[MIC] 🛑 Stopping audio-only mode');
      vertexStopAudio();
      setIsRecording(false);
      setIsAudioActive(false);
      
      toast({
        title: "Microphone stopped",
        description: "Voice input disabled",
        duration: 2000,
      });
      
      // Disconnect if no other streams active
      if (!vertexCameraActive && !vertexScreenSharing) {
        console.log('[MIC] 🔌 Disconnecting (no other streams)');
        vertexDisconnect();
      }
      return;
    }
    
    // START audio-only mode: STOP camera if active
    if (vertexCameraActive) {
      console.log('[MIC] 📹➡️🎤 Camera active, switching to audio-only mode');
      vertexStopCamera();
      setCameraFramesSent(false);
      
      toast({
        title: "Switched to audio-only",
        description: "Camera stopped, microphone active",
        duration: 2000,
      });
    }
    
    // Start microphone
    setIsRecording(true);
    setIsAudioActive(true);
    
    try {
      await vertexStartAudio();
      
      toast({
        title: "Microphone Active",
        description: "Gemini is listening (audio-only)",
        duration: 2000,
      });
      console.log('✅ Audio-only mode started');
    } catch (error) {
      console.error('[MIC] ❌ Error:', error);
      setIsRecording(false);
      setIsAudioActive(false);
      vertexStopAudio();
      showError(
        "Microphone Error",
        error instanceof Error ? error.message : "Could not start microphone"
      );
    }
  }

  const handleVideoToggle = () => {
    setIsVideoActive((v) => !v)
  }

  const handleSendText = async () => {
    if (!inputValue.trim() || isProcessing) return
    
    const userMessage = inputValue.trim()
    setInputValue("")
    setAssistantStreamingText("")
    setIsProcessing(true)
    
    try {
      if (!vertexConnected) {
        await vertexConnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      vertexSendText(userMessage);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Message sent",
        description: "Gemini is responding...",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Text error:', error);
      showError(
        "Send Error",
        error.message || "Failed to send message"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleConnectToCareTeam = () => {
    toast({
      title: "Connecting to Care Team",
      description: "A counselor will reach out to you shortly.",
    })
    setShowCrisisButton(false)
  }

  useEffect(() => {
    // One-time audio unlock on any user interaction
    const unlockAudio = async () => {
      await aiVoiceService.resumeAudio()
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
    
    window.addEventListener('click', unlockAudio, { once: true })
    window.addEventListener('touchstart', unlockAudio, { once: true })
    
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // Update camera feedback logic
  useEffect(() => {
    if (vertexCameraActive && vertexConnected) {
      setCameraFramesSent(true);
    } else {
      setCameraFramesSent(false);
    }
  }, [vertexCameraActive, vertexConnected]);
  
  // Suppress "closed before ready" during fallback reattempt
  const lastErrorRef = useRef<{ message: string; timestamp: number } | null>(null);
  useEffect(() => {
    if (vertexError) {
      // Ignore "closed before ready" if we're disconnected (clean shutdown)
      if (vertexError.includes('closed before ready') && vertexConnectionState === 'disconnected') {
        console.log('🔕 Ignoring false error after clean disconnect');
        return;
      }
      
      // Suppress "closed before ready (1006)" during auto-reconnect
      if (vertexError.includes('closed before ready') && vertexError.includes('1006')) {
        console.log('🔄 Connection fallback in progress, suppressing error...');
        return;
      }
      
      // More user-friendly error messages
      let errorMessage = vertexError;
      let errorTitle = "Connection Error";
      
      if (vertexError.includes('3 attempts') || vertexError.includes('Max reconnection')) {
        errorTitle = "Connection Failed";
        errorMessage = "Unable to connect to Gemini AI. Please check your internet connection and try again.";
      } else if (vertexError.includes('authentication') || vertexError.includes('token')) {
        errorTitle = "Authentication Error";
        errorMessage = "Please sign in again to continue.";
      }
      
      // Deduplication: skip if same error within 5 seconds
      const now = Date.now();
      if (lastErrorRef.current?.message === errorMessage && 
          now - lastErrorRef.current.timestamp < 5000) {
        console.log('🔕 Skipping duplicate error:', errorMessage);
        return;
      }
      
      // Update last error tracking
      lastErrorRef.current = { message: errorMessage, timestamp: now };
      showError(errorTitle, errorMessage);
    }
  }, [vertexError, vertexConnectionState, showError]);

  // Update streaming text from Vertex transcript
  useEffect(() => {
    if (useVertexLiveMode && vertexTranscript) {
      setAssistantStreamingText(vertexTranscript);
    }
  }, [useVertexLiveMode, vertexTranscript]);

  // Allow audio-only sessions; do not auto-stop mic when camera/screen are off
  useEffect(() => {
    // No-op to avoid unintended mic shutdown
  }, [vertexCameraActive, vertexScreenSharing, vertexRecording, isAudioActive, vertexStopAudio]);
  
  // Track camera frame transmission
  useEffect(() => {
    if (vertexCameraActive && vertexConnected) {
      // Camera is active and connected - frames are being sent
      setCameraFramesSent(true);
    } else {
      setCameraFramesSent(false);
    }
  }, [vertexCameraActive, vertexConnected]);

  useImperativeHandle(ref, () => ({
    activateVideo: async () => {
      console.log('StreamingChat: activateVideo called (Glass Mode), useVertexLive:', useVertexLiveMode);
      
      if (useVertexLiveMode) {
        try {
          // Cancel any ongoing TTS to avoid audio conflicts
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            console.log('🔇 Cancelled TTS before Vertex connection');
          }
          
          // Connect to Vertex in background if needed
          if (!vertexIsGeminiReady) {
            toast({
              title: "Connecting to Gemini...",
              description: "Starting Glass Mode",
              duration: 2000,
            });
            await vertexConnect();
          }
          
          // Start Glass Mode (dual-stream screen capture)
          await startGlassMode();
          
          // Start microphone audio
          await vertexStartAudio();
          
          // Set active immediately
          setIsVideoActive(true);
          
          // Bell notification only on Glass Mode start & Gemini ready
          if (vertexIsGeminiReady) {
            toast({
              title: "🪟 Glass Mode Active",
              description: "AI is watching your screen with advanced context",
              duration: 3000,
            });
          }
          
          console.log('✅ Glass Mode stream started');
        } catch (error) {
          console.error('❌ Failed to activate Glass Mode:', error);
          
          // Rollback all states on error
          setIsVideoActive(false);
          setIsAudioActive(false);
          if (vertexRecording) vertexStopAudio();
          if (glassModeActive) stopGlassMode();
          vertexDisconnect();
          
          showError(
            "Glass Mode Failed",
            error instanceof Error ? error.message : "Could not start Glass Mode"
          );
          
          // Re-throw so AppLayout can also rollback
          throw error;
        }
      } else {
        setIsVideoActive(true);
        setIsAudioActive(false);
      }
    },
    deactivateVideo: () => {
      console.log('StreamingChat: deactivateVideo called (Glass Mode)');
      
      if (useVertexLiveMode) {
        // Stop Glass Mode if active
        if (glassModeActive) {
          console.log('🛑 Stopping Glass Mode...');
          stopGlassMode();
        }
        
        // Stop all media streams
        if (vertexRecording) {
          console.log('🛑 Stopping audio...');
          vertexStopAudio();
        }
        if (vertexScreenSharing) {
          console.log('🛑 Stopping screen share...');
          vertexStopScreen();
        }
        if (vertexCameraActive) {
          console.log('🛑 Stopping camera...');
          vertexStopCamera();
        }
        
        console.log('🔌 Disconnecting from Vertex...');
        vertexDisconnect();
      }
      
      // Reset all states
      setIsVideoActive(false);
      setIsAudioActive(false);
      setIsRecording(false);
      setAssistantStreamingText('');
      console.log('✅ All streams stopped, states reset');
    },
    isStreamingActive: () => {
      // "Streaming" means Glass Mode is active, NOT just mic recording
      const active = useVertexLiveMode ? glassModeActive : isVideoActive;
      console.log('StreamingChat: isStreamingActive called, glassModeActive:', glassModeActive, 'returning:', active);
      return active;
    },
  }), [
    useVertexLiveMode,
    vertexConnect,
    vertexIsGeminiReady,
    vertexStartAudio,
    vertexStartScreen,
    vertexStopAudio,
    vertexStopScreen,
    vertexStopCamera,
    vertexDisconnect,
    vertexConnecting,
    vertexConnected,
    vertexRecording,
    vertexScreenSharing,
    vertexCameraActive,
    glassModeActive,
    startGlassMode,
    stopGlassMode,
    isVideoActive,
    toast,
    showError
  ])

  return (
    <>
      {/* Error notification stack */}
      <ErrorNotificationStack errors={errors} onDismiss={dismissError} />

      {showCrisisButton && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg flex items-center gap-3 z-50 shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">We're here to help</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConnectToCareTeam}
            className="bg-background text-foreground hover:bg-background/90"
          >
            Connect to Care Team
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCrisisButton(false)}
            className="h-6 w-6 p-0 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {assistantStreamingText && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 z-50">
          <div className="bg-card text-card-foreground px-4 py-3 rounded-lg shadow-lg border">
            <p className="text-sm">{assistantStreamingText}</p>
          </div>
        </div>
      )}

      {/* Vertex Live connection indicators */}
      {useVertexLiveMode && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
          {(() => {
            console.log('🔍 [UI Debug] vertexConnectionState:', vertexConnectionState, 'vertexIsGeminiReady:', vertexIsGeminiReady, 'vertexConnected:', vertexConnected);
            return null;
          })()}
          {vertexConnectionState === 'connecting' && (
            <div className="bg-amber-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs font-medium">Connecting to Gemini...</span>
            </div>
          )}
          {(vertexConnectionState === 'gemini_ready' || vertexConnectionState === 'connected') && (
            <div className="bg-emerald-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span className="text-xs font-medium">Gemini Ready</span>
            </div>
          )}
          {vertexConnectionState === 'error' && (
            <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <X className="h-3 w-3" />
              <span className="text-xs font-medium">Connection Error - Retrying...</span>
            </div>
          )}
          {vertexScreenSharing && (
            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span className="text-xs font-medium">Screen Sharing Active</span>
            </div>
          )}
          
          {/* Active mode indicators */}
          {vertexRecording && !vertexCameraActive && !vertexScreenSharing && !glassModeActive && (
            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Mic className="h-3 w-3" />
              <span className="text-xs font-medium">Audio-Only Mode</span>
            </div>
          )}
          {vertexCameraActive && (
            <div className="bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <VideoIcon className="h-3 w-3" />
              <span className="text-xs font-medium">Camera Mode (Video)</span>
            </div>
          )}
          {glassModeActive && (
            <div className="bg-indigo-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span className="text-xs font-medium">Glass Mode (Screen)</span>
            </div>
          )}
        </div>
      )}

      {isStreaming && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card text-card-foreground px-3 py-2 rounded-lg flex items-center gap-2 z-50 shadow">
          <span className="text-xs">Stream is live</span>
          <span className="text-xs text-muted-foreground">{streamTime} minutes</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 hover:bg-accent"
            aria-label="Close live stream notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bottom communication bar */}
      <div
        id="comms-dock"
        className={
          `fixed inset-x-0 bottom-0 p-4 z-20 transition-colors rounded-t-xl ` +
          (isVideoActive && vertexScreenSharing ? "bg-ruby text-white" : "bg-muted text-foreground")
        }
        style={{ 
          position: 'fixed', 
          transform: 'translateZ(0)',
          '--comm-dock-h': '72px'
        } as React.CSSProperties}
        role="region"
        aria-label="Communication controls"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3 pr-20 md:pr-24">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              console.log('[AUTOPILOT] ✈️ Requesting Autopilot recommendations...');
              setIsAutopilotProcessing(true);
              
              try {
                // If not connected at all, connect first
                if (vertexConnectionState === 'disconnected') {
                  console.log('[AUTOPILOT] ⏳ Connecting to Gemini...');
                  await vertexConnect();
                  
                  // Wait for Gemini ready (max 20 attempts = 10s)
                  let attempts = 0;
                  while (!vertexIsGeminiReady && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                  }
                  
                  if (!vertexIsGeminiReady) {
                    throw new Error('Connection timeout - please try again');
                  }
                }
                
                const prompt = "Based on my context and recent activities, provide 3-5 actionable recommendations or suggestions that would be most helpful right now. Focus on practical next steps.";
                
                console.log('[AUTOPILOT] 📤 Sending autopilot request to Gemini');
                vertexSendText(prompt);
                
                toast({
                  title: "Autopilot Engaged",
                  description: "Analyzing and preparing suggestions...",
                  duration: 2000,
                });
                
                // Button will return to neutral via onResponseComplete callback
              } catch (error) {
                console.error('[AUTOPILOT] ❌ Error:', error);
                setIsAutopilotProcessing(false);
                showError(
                  "Autopilot Error",
                  error instanceof Error ? error.message : "Could not reach Gemini"
                );
              }
            }}
            disabled={isGeneratingMessage || isAutopilotProcessing}
            className={
              isAutopilotProcessing
                ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                : "hover:bg-accent rounded-full"
            }
            aria-label="Engage Autopilot"
            title="Autopilot - Get AI recommendations"
          >
            {isAutopilotProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plane className="h-5 w-5" />
            )}
          </Button>

          {/* Mic / Mute toggle - Smart mode: Mute when Glass Mode active, Mic otherwise */}
          {glassModeActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={glassModeToggleAudio}
              disabled={!glassModeHasAudio}
              className={
                glassModeAudioMuted
                  ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                  : glassModeHasAudio
                  ? "hover:bg-accent rounded-full"
                  : "opacity-50 cursor-not-allowed rounded-full"
              }
              aria-pressed={glassModeAudioMuted}
              aria-label={glassModeAudioMuted ? "Unmute screen audio" : "Mute screen audio"}
              title={glassModeHasAudio ? (glassModeAudioMuted ? "Unmute screen audio" : "Mute screen audio") : "No audio track available"}
            >
              {glassModeAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          ) : (vertexCameraActive || vertexScreenSharing) ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={vertexToggleMute}
              disabled={!vertexMicDisabled}
              className={
                vertexIsMuted
                  ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                  : "hover:bg-accent rounded-full"
              }
              aria-pressed={vertexIsMuted}
              aria-label={vertexIsMuted ? "Unmute stream audio" : "Mute stream audio"}
              title={vertexIsMuted ? "Unmute stream audio" : "Mute stream audio"}
            >
              {vertexIsMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMicToggle}
              disabled={isProcessing}
              className={
                isProcessing
                  ? "bg-ruby text-white hover:bg-ruby/90 rounded-full animate-pulse"
                  : isRecording
                  ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                  : "hover:bg-accent rounded-full"
              }
              aria-pressed={isRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              title={isRecording ? "Stop microphone" : "Start microphone"}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (vertexCameraActive) {
                // STOP camera
                console.log('[CAMERA] 🛑 Stopping camera and audio');
                vertexStopCamera();
                vertexStopAudio();
                setIsRecording(false);
                setIsAudioActive(false);
                setCameraFramesSent(false);
                
                toast({
                  title: "Camera stopped",
                  description: "Video feed disabled",
                  duration: 2000,
                });
              } else {
                // START camera
                try {
                  // Stop mic if active (camera replaces mic)
                  if (vertexRecording) {
                    console.log('[CAMERA] 🎤➡️📹 Stopping mic (camera mode starting)');
                    vertexStopAudio();
                    setIsRecording(false);
                    setIsAudioActive(false);
                  }
                  
                  console.log('[CAMERA] ▶️ Starting camera');
                  await vertexStartCamera();
                  
                  // Wait for first frame confirmation
                  setTimeout(() => {
                    if (vertexCameraActive) {
                      toast({
                        title: "Camera Active",
                        description: "AI is watching your camera feed (video mode)",
                        duration: 3000,
                      });
                    }
                  }, 2000);
                } catch (error) {
                  console.error('[CAMERA] ❌ Error:', error);
                  setCameraFramesSent(false);
                  showError(
                    "Camera Error",
                    error instanceof Error ? error.message : "Failed to access camera"
                  );
                }
              }
            }}
            className={vertexCameraActive ? "bg-ruby text-white hover:bg-ruby/90 rounded-full" : "hover:bg-accent rounded-full"}
            aria-pressed={vertexCameraActive}
            aria-label="Toggle camera"
          >
            <VideoIcon className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent rounded-full"
                aria-label="Select language"
              >
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.label}
                  onClick={() => {
                    console.log('[LANG-TIMING] 1️⃣ UI Click:', new Date().toISOString(), option.value);
                    setSelectedLanguage(option.value);
                  }}
                  className={selectedLanguage === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={
                (() => {
                  if (isAutopilotProcessing) return "Autopilot is analyzing and preparing suggestions…";
                  if (isProcessing) return "Processing...";
                  
                  let base = "";
                  if (glassModeActive) {
                    base = "AI is watching your screen (Glass Mode)";
                    if (glassModeHasAudio && !glassModeAudioMuted) {
                      base = "AI is watching your screen and listening";
                    } else if (glassModeAudioMuted) {
                      base += " (audio muted)";
                    }
                  } else if (vertexRecording && !vertexCameraActive && !vertexScreenSharing) {
                    // Audio-only mode
                    base = "Listening (audio-only)...";
                  } else if (vertexCameraActive) {
                    if (cameraFramesSent) {
                      base = "AI is watching your camera (video mode)";
                    } else {
                      base = "Capturing video frames…";
                    }
                  } else if (vertexScreenSharing) {
                    base = "AI is watching your screen";
                  } else {
                    base = "Type or speak";
                  }
                  
                  if (vertexIsMuted && (vertexCameraActive || vertexScreenSharing) && !glassModeActive) {
                    base += " (audio muted)";
                  }
                  
                  return base;
                })()
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none text-sm"
              aria-label="Type a message"
            />
            {inputValue && !isProcessing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSendText}
                className="h-8 w-8 hover:bg-accent rounded-full"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <DiaryButton />
      </div>
    </>
  )
})

StreamingChat.displayName = "StreamingChat"
