import { useRef, useState, useEffect } from "react";
import { Mic, BookOpen, Eye, Undo2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart?: () => void;
  onresult?: (event: SpeechRecognitionEvent) => void;
  onerror?: (event: SpeechRecognitionErrorEvent) => void;
  onend?: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export default function DiaryButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recentSaveRef = useRef<{ id: string; timeoutId: number } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      if (recentSaveRef.current) {
        window.clearTimeout(recentSaveRef.current.timeoutId);
      }
    };
  }, []);

  const getLanguage = () => {
    return navigator.language || "en-US";
  };

  const saveDiaryEntry = async (transcript: string, duration: number = 0) => {
    try {
      const { data, error } = await (supabase as any)
        .from('diary_entries')
        .insert({
          content: transcript,
          duration_seconds: duration,
          entry_type: 'voice',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Clear any existing undo timeout
      if (recentSaveRef.current) {
        window.clearTimeout(recentSaveRef.current.timeoutId);
      }

      // Set up new undo timeout (10 seconds)
      const timeoutId = window.setTimeout(() => {
        recentSaveRef.current = null;
      }, 10000);

      recentSaveRef.current = { id: data.id, timeoutId };

      // Show success toast with actions
      const timestamp = new Date().toLocaleTimeString();
      toast({
        title: "Diary saved",
        description: `Voice entry recorded at ${timestamp}`,
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/memory/timeline')}
              className="h-8"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => undoSave()}
              className="h-8"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
          </div>
        ),
      });

      return data.id;
    } catch (error: any) {
      console.error("Failed to save diary entry:", error);
      toast({
        title: "Save failed",
        description: "Could not save your diary entry. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const undoSave = async () => {
    if (!recentSaveRef.current) {
      toast({
        title: "Cannot undo",
        description: "No recent save to undo or undo period expired.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('diary_entries')
        .delete()
        .eq('id', recentSaveRef.current.id);

      if (error) throw error;

      // Clear the undo reference
      window.clearTimeout(recentSaveRef.current.timeoutId);
      recentSaveRef.current = null;

      toast({
        title: "Entry deleted",
        description: "Your diary entry has been removed.",
      });
    } catch (error: any) {
      console.error("Failed to delete diary entry:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete the entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      toast({
        title: "Voice dictation not supported",
        description: "Voice dictation isn't supported in this browser",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Voice dictation not supported",
        description: "Voice dictation isn't supported in this browser",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = getLanguage();

    recognition.onstart = () => {
      setIsRecording(true);
      
      // Auto-stop after 60 seconds (safety)
      recordingTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 60000);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript.trim()) {
        const duration = recordingTimeoutRef.current ? 
          Math.floor((60000 - (recordingTimeoutRef.current - Date.now())) / 1000) : 0;
        
        setIsProcessing(true);
        saveDiaryEntry(finalTranscript.trim(), duration).finally(() => {
          setIsProcessing(false);
        });
      } else {
        // Empty transcript
        toast({
          title: "No speech detected",
          description: "Try speaking closer to your microphone",
          variant: "destructive",
        });
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setIsProcessing(false);
      
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone permission needed",
          description: "Allow microphone access in browser settings",
          variant: "destructive",
        });
      } else if (event.error === 'no-speech') {
        toast({
          title: "No speech detected",
          description: "Try speaking closer to your microphone",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recording failed",
          description: "Could not record audio. Please try again.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  };

  const isDisabled = !window.webkitSpeechRecognition && !window.SpeechRecognition;

  return (
    <button
      onClick={handleClick}
      onKeyDown={(e) => { 
        if (e.key === "Enter" || e.key === " ") { 
          e.preventDefault(); 
          handleClick();
        } 
      }}
      disabled={isDisabled || isProcessing}
      aria-label={isRecording ? "Recording... Tap to stop" : "Diary voice dictation"}
      aria-pressed={isRecording}
      title={
        isDisabled 
          ? "Voice dictation not supported" 
          : isRecording 
            ? "Recording…" 
            : isProcessing
              ? "Processing..."
              : "Diary"
      }
      className={[
        "absolute right-4 md:right-5 bottom-2 md:bottom-3", // inside corner
        "h-12 w-12 md:h-14 md:w-14 rounded-full select-none",
        "ring-1 ring-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]",
        "grid place-items-center transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDisabled 
          ? "text-white opacity-50 cursor-not-allowed"
          : isRecording 
            ? "text-white diary-pulse" 
            : isProcessing
              ? "text-white opacity-75"
              : "text-white hover:scale-[1.03] active:scale-[0.98]"
      ].join(" ")}
      style={{
        background: isRecording ? "var(--brand-live)" : "radial-gradient(120% 120% at 30% 20%, #0f172a 0%, #0b1220 100%)"
      }}
    >
      {/* stacked mic + pen */}
      <span className="relative inline-block" aria-hidden="true">
        <Mic className="h-4 w-4 absolute -left-0.5 -top-0.5 opacity-95" />
        <BookOpen className="h-3 w-3 translate-x-2.5 translate-y-2.5 opacity-70" />
      </span>
    </button>
  );
}