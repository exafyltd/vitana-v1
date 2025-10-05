import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react"
import { Mic, Video as VideoIcon, X, Send, Settings, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import DiaryButton from "@/components/diary/DiaryButton"
import { aiVoiceService } from "@/services/aiVoiceService"
import { useToast } from "@/hooks/use-toast"
import { ApiKeySettingsModal } from "@/components/chat/ApiKeySettingsModal"
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

  const handleClose = () => {
    setIsAudioActive(false)
    setIsVideoActive(false)
  }

  const handleMicToggle = async () => {
    if (isRecording) {
      // Stop recording and send to AI
      setIsRecording(false)
      setIsProcessing(true)
      
      try {
        const audioBlob = await aiVoiceService.stopRecording()
        const response = await aiVoiceService.sendVoiceMessage(audioBlob)
        
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
      // Start recording
      try {
        await aiVoiceService.startRecording()
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
    
    const userMessage = inputValue.trim()
    setInputValue("") // Clear immediately
    setIsProcessing(true)
    
    try {
      let streamedText = ""
      
      const response = await aiVoiceService.sendTextMessage(
        userMessage, 
        selectedLanguage,
        // onTextChunk callback
        (chunk: string) => {
          streamedText += chunk
          setInputValue(streamedText)
        },
        // onAudioChunk callback
        (audioData: string) => {
          // Audio is automatically queued and played by the service
          console.log('Audio chunk received')
        }
      )
      
      // Check for crisis
      if (response.crisisDetected) {
        setShowCrisisButton(true)
      }
      
      // Clear after streaming completes
      setTimeout(() => setInputValue(""), 3000)
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
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
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
