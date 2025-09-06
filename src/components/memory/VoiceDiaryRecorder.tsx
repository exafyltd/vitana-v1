import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Square, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceDiaryRecorderProps {
  onRecordingChange?: (isRecording: boolean) => void;
}

export default function VoiceDiaryRecorder({ onRecordingChange }: VoiceDiaryRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly for the best transcription results",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
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
      
      toast({
        title: "Recording Stopped",
        description: "Processing your voice entry...",
      });
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call our Supabase edge function for transcription
        const { data, error } = await supabase.functions.invoke('transcribe-voice-diary', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          throw error;
        }
        
        setTranscribedText(data.text || "Transcription failed. Please try again.");
        setIsProcessing(false);
        
        toast({
          title: "Transcription Complete",
          description: "Your voice has been converted to text. Review and save your entry.",
        });
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Transcription Failed",
        description: "Could not process your voice entry. Please try again.",
        variant: "destructive",
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
      // Save to diary_entries table (will be created in migration)
      const { error } = await supabase.from('diary_entries').insert({
        content: transcribedText,
        duration_seconds: recordingDuration,
        entry_type: 'voice',
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Reset form
      setTranscribedText("");
      setAudioBlob(null);
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
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
            disabled={isProcessing}
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

      {/* Processing State */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Transcribing your voice entry...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcription Result */}
      {transcribedText && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Voice Entry</h3>
              <Badge variant="outline">
                Duration: {formatDuration(recordingDuration)}
              </Badge>
            </div>
            
            <Textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="Edit your transcribed text here..."
              className="min-h-32"
            />
            
            <div className="flex gap-2">
              <Button onClick={saveDiaryEntry} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}