import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/fileUpload';

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  className?: string;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  className,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create audio element for playback
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onloadedmetadata = () => {
          if (isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          // Otherwise keep the timer-based duration already in state
        };

        setHasRecording(true);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up
    setHasRecording(false);
    setDuration(0);
    setCurrentTime(0);
    audioChunksRef.current = [];
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    onCancel?.();
  };

  const playRecording = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        
        // Update current time during playback
        audioRef.current.ontimeupdate = () => {
          setCurrentTime(audioRef.current?.currentTime || 0);
        };
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
      }
      setIsPlaying(!isPlaying);
    }
  };

  const sendRecording = () => {
    if (audioChunksRef.current.length > 0 && onRecordingComplete) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onRecordingComplete(audioBlob, duration);
      
      // Reset state
      setHasRecording(false);
      setDuration(0);
      setCurrentTime(0);
      audioChunksRef.current = [];
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
  };

  if (hasRecording) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-muted/50 rounded-lg", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={playRecording}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex-1">
          <div className="text-sm font-medium">Voice Message</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {formatFileSize(audioChunksRef.current.reduce((acc, chunk) => acc + (chunk as Blob).size, 0))}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
          className="h-8 w-8 p-0 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={sendRecording}
          className="h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-destructive/10 rounded-lg", className)}>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">Recording...</span>
        </div>
        
        <div className="flex-1 text-right">
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startRecording}
      disabled={disabled}
      className={cn("h-8 w-8 p-0", className)}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};