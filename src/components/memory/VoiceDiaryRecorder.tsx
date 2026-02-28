import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoiceDiaryRecorderProps {
  onRecordingChange?: (isRecording: boolean) => void;
}

export default function VoiceDiaryRecorder({ onRecordingChange }: VoiceDiaryRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const sttRef = useRef<ClientSTT | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!ClientSTT.isSupported()) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Initialize ClientSTT with real-time callbacks
      const sttLanguage = selectedLanguage || 'de-DE';
      console.log('[Voice Diary] Starting STT with language:', sttLanguage);
      
      sttRef.current = new ClientSTT({
        language: sttLanguage,
        continuous: true,
        interimResults: true,
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            // Append final transcription
            setTranscribedText(prev => prev + (prev ? ' ' : '') + transcript);
            setInterimText('');
          } else {
            // Show interim results
            setInterimText(transcript);
          }
        },
        onError: (error) => {
          console.error('[Voice Diary] STT Error:', error);
          // Don't stop on "no-speech" or "aborted" — these are recoverable on mobile
          if (error === 'no-speech' || error === 'aborted') {
            console.log('[Voice Diary] Recoverable error, will auto-restart via onEnd');
            return;
          }
          toast({
            title: "Recognition Error",
            description: "Speech recognition encountered an error. Please try again.",
            variant: "destructive",
          });
          stopRecording();
        },
        onEnd: () => {
          console.log('[Voice Diary] STT onEnd fired, isRecordingRef:', isRecordingRef.current);
          // Clear any pending restart
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          if (isRecordingRef.current && sttRef.current) {
            // Clear interim text before restart to prevent duplication
            setInterimText('');
            // Delay restart to let browser fully tear down previous session
            restartTimeoutRef.current = setTimeout(() => {
              if (isRecordingRef.current && sttRef.current) {
                try {
                  console.log('[Voice Diary] Restarting STT...');
                  sttRef.current.start();
                } catch (e) {
                  console.warn('[Voice Diary] Failed to restart STT:', e);
                }
              }
            }, 500);
          }
        }
      });

      sttRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingDuration(0);
      setTranscribedText('');
      setInterimText('');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly - you'll see your words appear in real-time",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not start speech recognition. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    // Set ref FIRST to prevent onEnd from restarting
    isRecordingRef.current = false;
    
    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (sttRef.current && isRecording) {
      sttRef.current.stop();
      setIsRecording(false);
      setInterimText('');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast({
        title: "Recording Stopped",
        description: "Review and edit your transcription before saving.",
      });
    }
  };

  const saveDiaryEntry = async () => {
    if (!transcribedText.trim()) {
      toast({
        title: "No Content",
        description: "Please record or enter some content before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('diary_entries').insert({
        user_id: user.id,
        text: transcribedText,
        duration: recordingDuration,
        source: 'voice'
      });

      if (error) throw error;

      // Reset form
      setTranscribedText("");
      setRecordingDuration(0);
      
      toast({
        title: "Entry Saved",
        description: "Your diary entry has been added to your memory timeline.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your diary entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <Button 
            onClick={startRecording}
            size="lg"
            className="h-16 w-16 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300"
          >
            <Mic className="h-8 w-8" />
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <Button 
              onClick={stopRecording}
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full"
            >
              <Square className="h-8 w-8" />
            </Button>
            <div className="text-center">
              <Badge variant="destructive" className="animate-pulse">
                Recording
              </Badge>
              <div className="text-2xl font-mono font-bold text-destructive mt-1">
                {formatDuration(recordingDuration)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      {isRecording && (
        <div className="flex justify-center">
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-primary rounded-full w-2 animate-pulse"
                style={{
                  height: `${Math.random() * 40 + 20}px`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Real-time Transcription Display */}
      {(isRecording || transcribedText) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {isRecording ? "Live Transcription" : "Your Voice Entry"}
              </h3>
              {!isRecording && (
                <Badge variant="outline">
                  Duration: {formatDuration(recordingDuration)}
                </Badge>
              )}
            </div>
            
            <Textarea
              value={transcribedText + (interimText ? ' ' + interimText : '')}
              onChange={(e) => !isRecording && setTranscribedText(e.target.value)}
              placeholder={isRecording ? "Start speaking..." : "Edit your transcribed text here..."}
              className="min-h-32"
              disabled={isRecording}
            />
            
            {interimText && isRecording && (
              <p className="text-xs text-muted-foreground italic">
                Interim text appears in gray until finalized...
              </p>
            )}
            
            {!isRecording && transcribedText && (
              <div className="flex gap-2">
                <Button onClick={saveDiaryEntry} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}