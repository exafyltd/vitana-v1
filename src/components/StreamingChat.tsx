import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react"
import { Mic, Video as VideoIcon, X, Send, Sparkles, Globe, Monitor, Loader2 } from "lucide-react"
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
  const [isSparklesProcessing, setIsSparklesProcessing] = useState(false)
  const fadeTimeoutRef = useRef<NodeJS.Timeout>()

  const { selectedLanguage, setSelectedLanguage, languageOptions, isLoading: languageLoading } = useLanguage()
  const { toast } = useToast()
  const { preferences } = useUserPreferences()
  const { triggerProactiveMessage, isGenerating: isGeneratingMessage } = useProactiveAssistant()
  const { errors, showError, dismissError } = useErrorNotifications()
  
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
    transcript: vertexTranscript,
    error: vertexError,
    connect: vertexConnect,
    disconnect: vertexDisconnect,
    startAudio: vertexStartAudio,
    stopAudio: vertexStopAudio,
    startScreen: vertexStartScreen,
    stopScreen: vertexStopScreen,
    startCamera: vertexStartCamera,
    stopCamera: vertexStopCamera,
    sendText: vertexSendText,
  } = useVertexLive()

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
    console.log('[MIC] 🎤 Microphone button clicked, vertexRecording:', vertexRecording);
    
    // Block if camera is active
    if (vertexCameraActive) {
      console.log('[MIC] ⚠️ Camera is active, mic is disabled');
      return;
    }
    
    if (vertexRecording) {
      // STOP: immediate
      console.log('[MIC] 🛑 Stopping audio');
      vertexStopAudio();
      setIsRecording(false);
      setIsAudioActive(false);
    } else {
      // START: optimistic + background connection
      setIsRecording(true);
      setIsAudioActive(true);
      
      try {
        // Connect in background if needed
        if (!vertexIsGeminiReady) {
          toast({
            title: "Connecting to Gemini...",
            description: "Starting microphone",
            duration: 2000,
          });
          await vertexConnect();
        }
        
        await vertexStartAudio();
        
        toast({
          title: "Microphone Active",
          description: "Gemini is listening",
          duration: 2000,
        });
        console.log('✅ Vertex audio recording started');
      } catch (error) {
        // Rollback on error
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

  // Show Vertex errors with new error notification system
  useEffect(() => {
    if (vertexError) {
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
      
      showError(errorTitle, errorMessage);
    }
  }, [vertexError, showError]);

  // Update streaming text from Vertex transcript
  useEffect(() => {
    if (useVertexLiveMode && vertexTranscript) {
      setAssistantStreamingText(vertexTranscript);
    }
  }, [useVertexLiveMode, vertexTranscript]);

  useImperativeHandle(ref, () => ({
    activateVideo: async () => {
      console.log('StreamingChat: activateVideo called, useVertexLive:', useVertexLiveMode);
      
      if (useVertexLiveMode) {
        try {
          // Cancel any ongoing TTS to avoid audio conflicts
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            console.log('🔇 Cancelled TTS before Vertex connection');
          }
          
          // Connect in background if needed
          if (!vertexIsGeminiReady) {
            toast({
              title: "Connecting to Gemini...",
              description: "Starting stream",
              duration: 2000,
            });
            await vertexConnect();
          }
          
          // Start screen share FIRST (this is primary)
          await vertexStartScreen();
          
          // Then start audio
          await vertexStartAudio();
          
          // Set active immediately
          setIsVideoActive(true);
          
          toast({
            title: "Stream Active",
            description: "Screen sharing and microphone enabled",
            duration: 2000,
          });
          
          console.log('✅ Vertex Live stream started');
        } catch (error) {
          console.error('❌ Failed to activate Vertex Live:', error);
          
          // Rollback all states on error
          setIsVideoActive(false);
          setIsAudioActive(false);
          if (vertexRecording) vertexStopAudio();
          if (vertexScreenSharing) vertexStopScreen();
          vertexDisconnect();
          
          showError(
            "Connection Failed",
            error instanceof Error ? error.message : "Could not connect to Gemini AI"
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
      console.log('StreamingChat: deactivateVideo called');
      
      if (useVertexLiveMode) {
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
      // Return true when connected and recording (immediate feedback)
      const active = useVertexLiveMode ? (vertexConnected && vertexRecording) : isVideoActive;
      console.log('StreamingChat: isStreamingActive called, returning:', active);
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
    isVideoActive,
    toast
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
              console.log('[SPARKLES] ✨ Requesting AI advice via Gemini Live...');
              setIsSparklesProcessing(true);
              
              try {
                // Ensure Gemini is ready first
                if (!vertexIsGeminiReady) {
                  console.log('[SPARKLES] ⏳ Connecting to Gemini...');
                  await vertexConnect();
                  
                  // Wait for Gemini ready
                  let attempts = 0;
                  while (!vertexIsGeminiReady && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                  }
                  
                  if (!vertexIsGeminiReady) {
                    throw new Error('Connection timeout - please try again');
                  }
                }
                
                const prompt = preferences?.auto_greeting_enabled 
                  ? "Based on our conversation so far, what advice or recommendation would be most helpful for me right now?"
                  : "Hello! What can you help me with today?";
                
                console.log('[SPARKLES] 📤 Sending prompt to Gemini');
                vertexSendText(prompt);
                
                toast({
                  title: "AI Advice Requested",
                  description: "Gemini is thinking...",
                  duration: 2000,
                });
                
                // Auto-return to neutral after 3 seconds
                setTimeout(() => {
                  setIsSparklesProcessing(false);
                }, 3000);
              } catch (error) {
                console.error('[SPARKLES] ❌ Error:', error);
                setIsSparklesProcessing(false);
                showError(
                  "Connection Error",
                  error instanceof Error ? error.message : "Could not reach Gemini"
                );
              }
            }}
            disabled={isGeneratingMessage || vertexConnecting || isSparklesProcessing}
            className={
              isSparklesProcessing || vertexConnecting
                ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                : "hover:bg-accent rounded-full"
            }
            aria-label="Get AI Advice"
          >
            {vertexConnecting || isSparklesProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleMicToggle}
            disabled={isProcessing || vertexCameraActive}
            className={
              vertexCameraActive
                ? "opacity-50 cursor-not-allowed rounded-full"
                : isProcessing
                ? "bg-ruby text-white hover:bg-ruby/90 rounded-full animate-pulse"
                : isRecording
                ? "bg-ruby text-white hover:bg-ruby/90 rounded-full"
                : "hover:bg-accent rounded-full"
            }
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <Mic className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (vertexCameraActive) {
                // STOP: immediate
                console.log('[CAMERA] 🛑 Stopping camera');
                vertexStopCamera();
              } else {
                // START: optimistic + background connection
                try {
                  // Stop mic if active (camera disables mic)
                  if (vertexRecording) {
                    console.log('[CAMERA] 🛑 Stopping mic (camera activating)');
                    vertexStopAudio();
                    setIsRecording(false);
                    setIsAudioActive(false);
                  }
                  
                  // Connect in background if needed
                  if (!vertexIsGeminiReady) {
                    toast({
                      title: "Connecting to Gemini...",
                      description: "Starting camera",
                      duration: 2000,
                    });
                    await vertexConnect();
                  }
                  
                  console.log('[CAMERA] ▶️ Starting camera');
                  await vertexStartCamera();
                  
                  toast({
                    title: "Camera Active",
                    description: "Gemini can now see your camera feed",
                    duration: 2000,
                  });
                } catch (error) {
                  console.error('[CAMERA] ❌ Error:', error);
                  showError(
                    "Camera Error",
                    error instanceof Error ? error.message : "Failed to access camera"
                  );
                }
              }
            }}
            disabled={vertexConnecting}
            className={vertexCameraActive ? "bg-ruby text-white hover:bg-ruby/90 rounded-full" : "hover:bg-accent rounded-full"}
            aria-pressed={vertexCameraActive}
            aria-label="Toggle camera"
          >
            {vertexConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <VideoIcon className="h-5 w-5" />
            )}
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
                isProcessing 
                  ? "Processing..." 
                  : vertexRecording 
                  ? "AI is listening, please talk"
                  : vertexCameraActive
                  ? "AI is listening and watching"
                  : vertexScreenSharing
                  ? "AI is watching your screen"
                  : "Type or speak"
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
