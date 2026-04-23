import React, { useState, useRef } from 'react'
import { Mic, BookOpen } from 'lucide-react'
import { DiaryQuickEntry } from './DiaryQuickEntry'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart?: () => void
  onresult?: (event: SpeechRecognitionEvent) => void
  onerror?: (event: SpeechRecognitionErrorEvent) => void
  onend?: () => void
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

export const DiaryOrb: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [showDiary, setShowDiary] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = () => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      // Browser doesn't support speech recognition, open diary with empty content
      setShowDiary(true)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setShowDiary(true)
      return
    }

    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript)
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setShowDiary(true)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setShowDiary(true)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      setTranscript('')
      startRecording()
    }
  }

  const handleDiaryClose = () => {
    setShowDiary(false)
    setTranscript('')
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={[
          "absolute right-4 md:right-6 top-1/2 -translate-y-1/2",
          "h-14 w-14 md:h-16 md:w-16 rounded-full ring-1 ring-black/10",
          "shadow-[0_6px_18px_rgba(0,0,0,0.12)] grid place-items-center",
          "transition-transform duration-150 select-none z-10",
          isRecording
            ? "bg-[hsl(var(--brand-live))] text-white diary-pulse"
            : "bg-slate-900 text-white hover:scale-[1.03] active:scale-[0.98]"
        ].join(" ")}
        style={{ 
          backgroundImage: isRecording ? "none" : "linear-gradient(180deg,#0f172a,#0b1220)" 
        }}
        role="button"
        aria-label={isRecording ? "Recording... Tap to stop" : "Diary voice dictation"}
        aria-pressed={isRecording}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
          if (e.key === 'Escape' && showDiary) {
            handleDiaryClose()
          }
        }}
        tabIndex={0}
      >
        <div className="relative flex items-center justify-center">
          <Mic className="h-5 w-5 md:h-6 md:w-6" />
          <BookOpen className="h-3 w-3 md:h-4 md:w-4 absolute -bottom-1 -right-1 opacity-70" />
        </div>
      </button>

      <DiaryQuickEntry
        open={showDiary}
        onClose={handleDiaryClose}
        initialContent={transcript.trim()}
      />
    </>
  )
}