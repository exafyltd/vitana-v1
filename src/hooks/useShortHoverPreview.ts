import { useEffect, useRef, useState, useCallback } from 'react';

interface UseShortHoverPreviewOptions {
  videoUrl: string;
  isVisible: boolean;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
}

// Global state to ensure only one preview plays at a time
let currentlyPlayingPreview: HTMLVideoElement | null = null;

export function useShortHoverPreview({
  videoUrl,
  isVisible,
  onPreviewStart,
  onPreviewEnd,
}: UseShortHoverPreviewOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  const [isHovering, setIsHovering] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Check if touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const stopPreview = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = ''; // Free memory
    }
    
    if (currentlyPlayingPreview === videoRef.current) {
      currentlyPlayingPreview = null;
    }
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    setIsPreviewing(false);
    setPreviewProgress(0);
    setLoadError(false);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  const startPreview = useCallback(async () => {
    // Don't start if disabled by preferences or device
    if (prefersReducedMotion || isTouchDevice || !isVisible) {
      return;
    }

    // Stop any other preview that's currently playing
    if (currentlyPlayingPreview && currentlyPlayingPreview !== videoRef.current) {
      currentlyPlayingPreview.pause();
      currentlyPlayingPreview.currentTime = 0;
    }

    const video = videoRef.current;
    if (!video) return;

    try {
      // Set load timeout - abort if not loaded within 800ms
      loadTimeoutRef.current = setTimeout(() => {
        setLoadError(true);
        stopPreview();
      }, 800);

      // Set up video source
      video.src = videoUrl;
      video.muted = true;
      video.preload = 'auto';
      
      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video load failed'));
      });

      clearTimeout(loadTimeoutRef.current);

      // Start playing
      currentlyPlayingPreview = video;
      await video.play();
      
      setIsPreviewing(true);
      onPreviewStart?.();

      // Cap preview to 3 seconds
      const duration = Math.min(video.duration, 3);
      
      // Update progress
      const progressInterval = setInterval(() => {
        if (video && !video.paused) {
          const progress = (video.currentTime / duration) * 100;
          setPreviewProgress(progress);
          
          if (video.currentTime >= duration) {
            video.pause();
            clearInterval(progressInterval);
          }
        }
      }, 50);

      // Auto-stop after duration
      previewTimeoutRef.current = setTimeout(() => {
        video.pause();
        clearInterval(progressInterval);
      }, duration * 1000);

    } catch (error) {
      console.warn('Preview autoplay blocked or failed:', error);
      setLoadError(true);
      stopPreview();
    }
  }, [videoUrl, isVisible, prefersReducedMotion, isTouchDevice, onPreviewStart, stopPreview]);

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion || isTouchDevice) return;
    
    setIsHovering(true);
    
    // Hover intent delay: 200ms
    hoverTimeoutRef.current = setTimeout(() => {
      startPreview();
    }, 200);
  }, [startPreview, prefersReducedMotion, isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    stopPreview();
  }, [stopPreview]);

  const handleFocus = useCallback(() => {
    if (prefersReducedMotion || isTouchDevice) return;
    handleMouseEnter();
  }, [handleMouseEnter, prefersReducedMotion, isTouchDevice]);

  const handleBlur = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  // Cleanup on unmount or when not visible
  useEffect(() => {
    if (!isVisible) {
      stopPreview();
    }
  }, [isVisible, stopPreview]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  // Set preload to metadata when near viewport
  useEffect(() => {
    const video = videoRef.current;
    if (video && isVisible) {
      video.preload = 'metadata';
    }
  }, [isVisible]);

  return {
    videoRef,
    isHovering,
    isPreviewing,
    previewProgress,
    loadError,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    disabled: prefersReducedMotion || isTouchDevice,
  };
}
