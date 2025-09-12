import { useState, useImperativeHandle, forwardRef } from "react"
import { Mic, Video as VideoIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiaryOrb } from "@/components/diary/DiaryOrb"

export interface StreamingChatRef {
  activateVideo: () => void
  deactivateVideo: () => void
  isStreamingActive: () => boolean // returns true when video is active
}

export const StreamingChat = forwardRef<StreamingChatRef>((props, ref) => {
  const [isAudioActive, setIsAudioActive] = useState(false)
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [streamTime] = useState("9:51")

  const isStreaming = isAudioActive || isVideoActive

  const handleClose = () => {
    setIsAudioActive(false)
    setIsVideoActive(false)
  }

  const handleMicToggle = () => {
    setIsAudioActive((v) => !v)
  }

  const handleVideoToggle = () => {
    setIsVideoActive((v) => !v)
  }

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
          `fixed inset-x-0 bottom-0 p-4 z-40 transition-colors rounded-t-xl relative ` +
          (isVideoActive ? "bg-ruby text-white" : "bg-muted text-foreground")
        }
        role="region"
        aria-label="Communication controls"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3 pr-20 md:pr-24">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMicToggle}
            className={(isAudioActive && !isVideoActive) ? "bg-ruby text-white hover:bg-ruby/90 rounded-full" : "hover:bg-accent rounded-full"}
            aria-pressed={isAudioActive}
            aria-label="Toggle microphone"
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

          <div className={`flex-1 ${isAudioActive && !isVideoActive ? "bg-ruby/20 rounded-lg px-3 py-2" : ""}`}>
            <input
              type="text"
              placeholder="Type something"
              className={`w-full bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none text-sm`}
              aria-label="Type a message"
            />
          </div>
        </div>
        
        <DiaryOrb />
      </div>
    </>
  )
})

StreamingChat.displayName = "StreamingChat"
