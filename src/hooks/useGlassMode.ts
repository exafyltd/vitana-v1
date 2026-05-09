import { useState, useRef, useCallback, useEffect } from 'react';
import { GlassModeManager, ScreenContext, PrivacyMask } from '@/utils/glassMode';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export const useGlassMode = () => {
  const [isActive, setIsActive] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [screenContext, setScreenContext] = useState<ScreenContext | null>(null);
  
  const { toast } = useToast();
  const managerRef = useRef<GlassModeManager | null>(null);
  
  // Callbacks for data streams
  const onOverviewFrameRef = useRef<((data: string) => void) | null>(null);
  const onRoiFrameRef = useRef<((data: string) => void) | null>(null);
  const onContextUpdateRef = useRef<((context: ScreenContext) => void) | null>(null);
  const onTextSnippetRef = useRef<((text: string) => void) | null>(null);
  
  /**
   * Start Glass Mode
   */
  const startGlassMode = useCallback(async () => {
    if (isActive) return;
    
    try {
      // Create manager if needed
      if (!managerRef.current) {
        managerRef.current = new GlassModeManager();
      }
      
      // Start capture
      await managerRef.current.start({
        onOverviewFrame: (data) => {
          if (onOverviewFrameRef.current) {
            onOverviewFrameRef.current(data);
          }
        },
        onRoiFrame: (data) => {
          if (onRoiFrameRef.current) {
            onRoiFrameRef.current(data);
          }
        },
        onContextUpdate: (context) => {
          setScreenContext(context);
          if (onContextUpdateRef.current) {
            onContextUpdateRef.current(context);
          }
        },
        onTextSnippet: (text) => {
          if (onTextSnippetRef.current) {
            onTextSnippetRef.current(text);
          }
        },
        onAudioStateChange: (enabled) => {
          setHasAudioTrack(enabled);
        },
      });
      
      setIsActive(true);
      
      notify('toasts.hooks.glassModeActive', 'toasts.hooks.aiWatchingYourScreen');
      
      console.log('🪟 Glass Mode started successfully');
    } catch (error) {
      console.error('❌ Glass Mode start failed:', error);
      
      notifyError('toasts.hooks.glassModeFailed');
      
      throw error;
    }
  }, [isActive, toast]);
  
  /**
   * Stop Glass Mode
   */
  const stopGlassMode = useCallback(() => {
    if (!isActive || !managerRef.current) return;
    
    managerRef.current.stop();
    setIsActive(false);
    setHasAudioTrack(false);
    setIsAudioMuted(false);
    setScreenContext(null);
    
    notify('toasts.hooks.glassModeStopped', 'toasts.hooks.screenCaptureHasDisabled');
    
    console.log('🪟 Glass Mode stopped');
  }, [isActive, toast]);
  
  /**
   * Toggle audio mute (only available when audio track exists)
   */
  const toggleAudioMute = useCallback(() => {
    if (!managerRef.current || !hasAudioTrack) return;
    
    const newMutedState = !isAudioMuted;
    managerRef.current.setScreenAudioEnabled(!newMutedState);
    setIsAudioMuted(newMutedState);
    
    toast({
      title: newMutedState ? "Audio Muted" : "Audio Unmuted",
      description: newMutedState ? "Screen audio is now muted" : "Screen audio is now active",
      duration: 1500,
    });
  }, [hasAudioTrack, isAudioMuted, toast]);
  
  /**
   * Set callback for overview frames
   */
  const setOnOverviewFrame = useCallback((callback: (data: string) => void) => {
    onOverviewFrameRef.current = callback;
  }, []);
  
  /**
   * Set callback for ROI frames
   */
  const setOnRoiFrame = useCallback((callback: (data: string) => void) => {
    onRoiFrameRef.current = callback;
  }, []);
  
  /**
   * Set callback for context updates
   */
  const setOnContextUpdate = useCallback((callback: (context: ScreenContext) => void) => {
    onContextUpdateRef.current = callback;
  }, []);
  
  /**
   * Set callback for text snippets
   */
  const setOnTextSnippet = useCallback((callback: (text: string) => void) => {
    onTextSnippetRef.current = callback;
  }, []);
  
  /**
   * Add privacy mask
   */
  const addPrivacyMask = useCallback((mask: PrivacyMask) => {
    if (managerRef.current) {
      managerRef.current.addPrivacyMask(mask);
    }
  }, []);
  
  /**
   * Clear privacy masks
   */
  const clearPrivacyMasks = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clearPrivacyMasks();
    }
  }, []);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, []);
  
  return {
    isActive,
    hasAudioTrack,
    isAudioMuted,
    screenContext,
    startGlassMode,
    stopGlassMode,
    toggleAudioMute,
    setOnOverviewFrame,
    setOnRoiFrame,
    setOnContextUpdate,
    setOnTextSnippet,
    addPrivacyMask,
    clearPrivacyMasks,
  };
};
