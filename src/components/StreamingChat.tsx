import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react"
import { Mic, Video as VideoIcon, X, Send, Settings, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import DiaryButton from "@/components/diary/DiaryButton"
import { aiVoiceService } from "@/services/aiVoiceService"
import { useToast } from "@/hooks/use-toast"
import { ApiKeySettingsModal } from "@/components/chat/ApiKeySettingsModal"
import { supabase } from "@/integrations/supabase/client"
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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined)
  const fadeTimeoutRef = useRef<NodeJS.Timeout>()

  const languageOptions = [
    { label: "Auto", value: undefined },
    { label: "🇷🇸 Serbian", value: "sr-RS" },
    { label: "🇩🇪 German", value: "de-DE" },
    { label: "🇺🇸 English", value: "en-US" },
    { label: "🇸🇦 Arabic", value: "ar-XA" },
    { label: "🇪🇸 Spanish", value: "es-ES" },
    { label: "🇷🇺 Russian", value: "ru-RU" },
    { label: "���🇳 Chinese", value: "zh-CN" },
  ]
  const { toast } = useToast()

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
    // Prime audio context on user gesture
    await aiVoiceService.resumeAudio()
    
    if (isRecording) {
      // Stop recording and send to AI
      setIsRecording(false)
      setIsProcessing(true)
      
      try {
        const audioBlob = await aiVoiceService.stopRecording()
        
        // Check if using client-side STT for instant transcription
        const clientTranscript = aiVoiceService.getClientTranscript();
        
        // Send message with instant transcript if available
        const response = await aiVoiceService.sendVoiceMessage(
          audioBlob, 
          clientTranscript || undefined
        )
        
        // Show AI response in input field
        setInputValue(response.text)
        
        // Play audio response if available
        if (response.audio) {
          await aiVoiceService.playAudio(response.audio)
        }
        
        // Check for crisis
        if (response.crisisDetected) {
          setShowCrisisButton(true)
        }
        
        // Auto-fade after 5 seconds
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = setTimeout(() => {
          setInputValue("")
        }, 5000)
      } catch (error) {
        console.error('Voice error:', error)
        toast({
          title: "Voice Error",
          description: error instanceof Error ? error.message : "Failed to process voice",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
      }
    } else {
      // Start recording with instant client-side STT
      try {
        await aiVoiceService.startRecording({
          useClientSTT: true, // Enable instant transcription
          language: selectedLanguage
        })
        setIsRecording(true)
      } catch (error) {
        console.error('Recording error:', error)
        toast({
          title: "Microphone Error",
          description: "Could not access microphone",
          variant: "destructive",
        })
      }
    }
  }

  const handleVideoToggle = () => {
    setIsVideoActive((v) => !v)
  }

  const handleSendText = async () => {
    if (!inputValue.trim() || isProcessing) return
    
    // Prime audio context on user gesture
    await aiVoiceService.resumeAudio()
    
    const userMessage = inputValue.trim()
    setInputValue("") // Clear immediately
    setAssistantStreamingText("") // Clear previous response
    setIsProcessing(true)
    
    try {
      await aiVoiceService.sendTextMessage(
        userMessage, 
        selectedLanguage,
        // onTextChunk callback - accumulate in dedicated streaming text
        (chunk: string) => {
          setAssistantStreamingText(prev => prev + chunk)
        },
        // onAudioChunk callback
        (audioData: string) => {
          // Audio is automatically queued and played by the service
        }
      )
      
      // Clear streaming text after completion
      setTimeout(() => setAssistantStreamingText(""), 3000)
    } catch (error) {
      console.error('Text error:', error)
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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

  useImperativeHandle(ref, () => ({
    activateVideo: () => {
      console.log('StreamingChat: activateVideo called');
      setIsVideoActive(true);
      setIsAudioActive(false);
    },
    deactivateVideo: () => {
      console.log('StreamingChat: deactivateVideo called');
      setIsVideoActive(false);
      setIsAudioActive(false);
    },
    isStreamingActive: () => {
      console.log('StreamingChat: isStreamingActive called, returning:', isVideoActive);
      return isVideoActive;
    },
  }))

  return (
    <>
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
          (isVideoActive ? "bg-ruby text-white" : "bg-muted text-foreground")
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
            onClick={() => setShowApiKeyModal(true)}
            className="hover:bg-accent rounded-full"
            aria-label="API Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

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
          >
            <Mic className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoToggle}
            className={isVideoActive ? "bg-ruby text-white hover:bg-ruby/90 rounded-full" : "hover:bg-accent rounded-full"}
            aria-pressed={isVideoActive}
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
                  onClick={() => setSelectedLanguage(option.value)}
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
              placeholder={isProcessing ? "Processing..." : isRecording ? "Recording..." : "Type or speak"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing || isRecording}
              className={`flex-1 bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none text-sm ${
                isRecording ? "opacity-50" : ""
              }`}
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

      <ApiKeySettingsModal 
        open={showApiKeyModal} 
        onOpenChange={setShowApiKeyModal} 
      />
    </>
  )
})

StreamingChat.displayName = "StreamingChat"
