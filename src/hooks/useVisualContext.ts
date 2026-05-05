import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface VisualContextConfig {
  captureInterval: number; // milliseconds between captures
  enableScreen: boolean;
  enableCamera: boolean;
}

export const useVisualContext = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<VisualContextConfig>({
    captureInterval: 30000, // 30 seconds default
    enableScreen: false,
    enableCamera: false,
  });
  
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  const captureFrame = useCallback(async (videoElement: HTMLVideoElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const processVisualData = useCallback(async () => {
    try {
      const captures: { type: string; data: string }[] = [];

      if (config.enableScreen && screenVideoRef.current) {
        const screenCapture = await captureFrame(screenVideoRef.current);
        captures.push({ type: 'screen', data: screenCapture });
      }

      if (config.enableCamera && cameraVideoRef.current) {
        const cameraCapture = await captureFrame(cameraVideoRef.current);
        captures.push({ type: 'camera', data: cameraCapture });
      }

      if (captures.length === 0) return;

      // Send to edge function for AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-visual-context', {
        body: { captures }
      });

      if (error) throw error;
      
      console.log('Visual context analyzed:', data);
    } catch (error) {
      console.error('Error processing visual data:', error);
    }
  }, [config.enableScreen, config.enableCamera, captureFrame]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 }
      });
      
      setScreenStream(stream);
      
      // Create video element for capture
      if (!screenVideoRef.current) {
        screenVideoRef.current = document.createElement('video');
        screenVideoRef.current.autoplay = true;
        screenVideoRef.current.muted = true;
      }
      screenVideoRef.current.srcObject = stream;

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      notify('toasts.hooks.screenSharingStarted', 'toasts.hooks.yourScreenContextNowAnalyzed');
    } catch (error) {
      console.error('Error starting screen share:', error);
      notifyError('toasts.hooks.screenSharingFailed', 'toasts.hooks.couldNotAccessScreenSharing');
    }
  }, [toast]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      setCameraStream(stream);
      
      // Create video element for capture
      if (!cameraVideoRef.current) {
        cameraVideoRef.current = document.createElement('video');
        cameraVideoRef.current.autoplay = true;
        cameraVideoRef.current.muted = true;
      }
      cameraVideoRef.current.srcObject = stream;

      notify('toasts.hooks.cameraStarted', 'toasts.hooks.yourCameraContextNowAnalyzed');
    } catch (error) {
      console.error('Error starting camera:', error);
      notifyError('toasts.hooks.cameraFailed', 'toasts.hooks.couldNotAccessCamera');
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  const startCapture = useCallback(async () => {
    if (config.enableScreen) {
      await startScreenShare();
    }
    if (config.enableCamera) {
      await startCamera();
    }

    setIsCapturing(true);

    // Start periodic capture
    intervalRef.current = setInterval(() => {
      processVisualData();
    }, config.captureInterval);

    // Immediate first capture
    setTimeout(() => processVisualData(), 2000);
  }, [config.enableScreen, config.enableCamera, config.captureInterval, startScreenShare, startCamera, processVisualData]);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    stopScreenShare();
    stopCamera();
    setIsCapturing(false);

    notify('toasts.hooks.visualContextStopped', 'toasts.hooks.contextCaptureHasDisabled');
  }, [stopScreenShare, stopCamera, toast]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopScreenShare();
      stopCamera();
    };
  }, [stopScreenShare, stopCamera]);

  return {
    isCapturing,
    screenStream,
    cameraStream,
    config,
    setConfig,
    startCapture,
    stopCapture,
  };
};
