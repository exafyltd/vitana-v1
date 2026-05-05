import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

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
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

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
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          if (isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        setHasRecording(true);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionDenied(true);
      setTimeout(() => onCancel?.(), 1500);
    }
  };

  // Auto-start recording on mount (WhatsApp-style)
  useEffect(() => {
    if (!disabled) {
      startRecording();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (permissionDenied) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 text-sm text-destructive", className)}>
        {t('screens.ui.microphoneAccessDenied')}
      </div>
    );
  }

  // Review recording state — play/send/cancel
  if (hasRecording) {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    return (
      <div className={cn("flex items-center gap-2 w-full", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
          className="h-9 w-9 p-0 rounded-full shrink-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={playRecording}
          className="h-9 w-9 p-0 rounded-full shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatTime(currentTime > 0 ? currentTime : duration)}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={sendRecording}
          disabled={disabled}
          className="h-9 w-9 p-0 rounded-full shrink-0 bg-domain-messages-accent text-white hover:bg-domain-messages-accent/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Active recording state — timer, stop, cancel
  if (isRecording) {
    return (
      <div className={cn("flex items-center gap-2 w-full", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
          className="h-9 w-9 p-0 rounded-full shrink-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="h-3 w-3 bg-destructive rounded-full animate-pulse shrink-0" />
          <div className="flex-1 h-1 bg-destructive/20 rounded-full" />
          <span className="text-sm text-muted-foreground tabular-nums shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={stopRecording}
          className="h-9 w-9 p-0 rounded-full shrink-0 bg-domain-messages-accent text-white hover:bg-domain-messages-accent/90"
        >
          <Square className="h-3 w-3 fill-current" />
        </Button>
      </div>
    );
  }

  // Loading state (waiting for permission)
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground", className)}>
      {t('screens.ui.startingRecorder')}
    </div>
  );
};
