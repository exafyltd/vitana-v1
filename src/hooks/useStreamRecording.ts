import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

interface UseStreamRecordingProps {
  streamId: string;
  localStream: MediaStream | null;
  isHost: boolean;
  enabled: boolean;
}

export const useStreamRecording = ({
  streamId,
  localStream,
  isHost,
  enabled
}: UseStreamRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isHost && enabled && localStream && !isRecording) {
      startRecording();
    }

    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isHost, enabled, localStream]);

  const startRecording = async () => {
    if (!localStream || !isHost || !enabled) return;

    try {
      // Check browser support
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          throw new Error('Browser does not support video recording');
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';

      const mediaRecorder = new MediaRecorder(localStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingError('Recording failed');
        notifyError('toasts.hooks.recordingErrorOccurred');
      };

      mediaRecorder.start(10000); // Collect data every 10 seconds
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Update stream status
      await supabase
        .from('community_live_streams')
        .update({ recording_status: 'recording' })
        .eq('id', streamId);

      notifySuccess('toasts.hooks.recordingStarted');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingError(error instanceof Error ? error.message : 'Failed to start recording');
      notifyError('toasts.hooks.couldNotStartRecording');
    }
  };

  const stopRecording = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve();
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = async () => {
        setIsRecording(false);

        try {
          // Create final blob from all chunks
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const durationSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);

          // Update stream status to processing
          await supabase
            .from('community_live_streams')
            .update({ recording_status: 'processing' })
            .eq('id', streamId);

          // Upload to Supabase Storage
          const fileName = `${streamId}_${Date.now()}.webm`;
          const filePath = `${streamId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('stream-recordings')
            .upload(filePath, blob, {
              contentType: 'video/webm',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('stream-recordings')
            .getPublicUrl(filePath);

          // Create recording entry in database
          const { error: dbError } = await supabase
            .from('stream_recordings')
            .insert({
              stream_id: streamId,
              recording_url: publicUrl,
              storage_path: filePath,
              duration_seconds: durationSeconds,
              file_size_bytes: blob.size,
              status: 'ready'
            });

          if (dbError) {
            throw dbError;
          }

          // Update stream status to ready
          await supabase
            .from('community_live_streams')
            .update({ recording_status: 'ready' })
            .eq('id', streamId);

          notifySuccess('toasts.hooks.recordingSavedSuccessfully');
        } catch (error) {
          console.error('Failed to save recording:', error);
          setRecordingError('Failed to save recording');
          
          // Update stream status to failed
          await supabase
            .from('community_live_streams')
            .update({ recording_status: 'failed' })
            .eq('id', streamId);

          notifyError('toasts.hooks.failedSaveRecording');
        } finally {
          recordedChunksRef.current = [];
          mediaRecorderRef.current = null;
          resolve();
        }
      };

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
        resolve();
      }
    });
  };

  return {
    isRecording,
    recordingError,
    startRecording,
    stopRecording
  };
};
