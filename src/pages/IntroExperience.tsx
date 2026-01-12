import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { getIntroVideoSrc, markIntroAsSeen } from '@/utils/introVideo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VitanalandPortalSeed } from '@/components/audio/VitanalandPortalSeed';
import { MobileFixedOrb } from '@/components/mobile/MobileFixedOrb';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useSoundscape } from '@/context/SoundscapeContext';
import { playSound } from '@/lib/playSound';
import { motion } from 'framer-motion';

const MAXINA_WELCOME_SSML = `<speak>
  Welcome to <phoneme alphabet="ipa" ph="viːˈtɑːnə">VITANA</phoneme> <break time="40ms"/> land.
  You're entering the Maxina experience — where calm begins and energy awakens.
  Let's explore, connect, and feel amazing together.
</speak>`;

export default function IntroExperience() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { expandToFull } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  const { startFresh, setVolume } = useSoundscape();
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [showContent, setShowContent] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to ensure soundscape starts playing (for user interaction)
  const ensureSoundscapePlaying = useCallback(() => {
    startFresh();
  }, [startFresh]);

  // Load video source
  useEffect(() => {
    if (tenantSlug) {
      getIntroVideoSrc(tenantSlug).then(setVideoSrc);
    }
  }, [tenantSlug]);

  // Show content after video starts
  useEffect(() => {
    if (videoRef.current) {
      const timer = setTimeout(() => setShowContent(true), 800);
      return () => clearTimeout(timer);
    }
  }, [videoSrc]);

  // Start soundscape when video loads
  useEffect(() => {
    if (videoSrc) {
      startFresh(0.04);
    }
  }, [videoSrc, startFresh]);

  // Fade soundscape volume when TTS is playing
  useEffect(() => {
    if (isPlayingAudio) {
      setVolume(0.015);
    } else {
      setVolume(0.04);
    }
  }, [isPlayingAudio, setVolume]);

  const continueToMaxina = useCallback(() => {
    if (tenantSlug) {
      markIntroAsSeen(tenantSlug);
    }
    
    setFadeOut(true);
    setTimeout(() => {
      // Let the portal handle auth-based routing
      navigate(`/${tenantSlug}`, { replace: true });
    }, 800);
  }, [tenantSlug, navigate]);

  const handleSkip = useCallback(() => {
    // Stop TTS audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    continueToMaxina();
  }, [continueToMaxina]);

  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    expandToFull();
    setTimeout(() => {
      setAudioOverlayVisible(true);
    }, 100);
  };

  const handlePlayAudio = useCallback(async () => {
    // Ensure soundscape starts on user click
    ensureSoundscapePlaying();
    
    setIsPreparingAudio(true);
    
    try {
      // Call Google Cloud TTS edge function
      const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
        body: {
          text: MAXINA_WELCOME_SSML,
          voiceId: 'en-US-Wavenet-F',
          languageCode: 'en-US',
          speakingRate: 0.96,
          pitch: 1.0,
          useSSML: true
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      // Create and play audio
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        continueToMaxina();
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        toast.error('Audio playback failed');
      };

      setIsPreparingAudio(false);
      setIsPlayingAudio(true);
      await audio.play();
      
    } catch (error) {
      console.error('TTS error:', error);
      setIsPreparingAudio(false);
      toast.error('Audio unavailable now');
    }
  }, [continueToMaxina, ensureSoundscapePlaying]);

  // Keyboard shortcuts - must be after function declarations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isPlayingAudio && !isPreparingAudio) {
          handlePlayAudio();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayingAudio, isPreparingAudio, handlePlayAudio, handleSkip]);

  if (!videoSrc) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 bg-black overflow-hidden transition-opacity duration-[800ms] ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/intro/maxina/poster.jpg"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Stronger Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Content */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-32 transition-opacity duration-[1000ms] ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={ensureSoundscapePlaying}
      >
        {/* Title - Lighter */}
        <p 
          className="text-lg md:text-xl font-medium text-white/80 text-center mb-2 animate-fade-in tracking-wide"
          style={{ animationDelay: '1200ms', animationFillMode: 'both' }}
        >
          Welcome to Vitanaland
        </p>

        {/* Primary - Maxina Experience */}
        <h1 
          className="text-4xl md:text-5xl font-bold text-white text-center mb-6 animate-fade-in"
          style={{ animationDelay: '1600ms', animationFillMode: 'both' }}
        >
          Maxina Experience
        </h1>

        {/* Caption - Shortened */}
        <p 
          className="text-base text-white/70 text-center max-w-xs mb-10 animate-fade-in"
          style={{ animationDelay: '2000ms', animationFillMode: 'both' }}
        >
          Your longevity, health, and community — guided.
        </p>

        {/* Controls - add bottom padding on mobile to avoid ORB overlap */}
        <div 
          className="flex flex-col items-center gap-6 animate-fade-in pb-32 md:pb-0"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {/* Play Button */}
          <Button
            onClick={handlePlayAudio}
            disabled={isPlayingAudio || isPreparingAudio}
            size="lg"
            className="relative bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 px-8 py-6 text-lg shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all duration-300"
          >
            {isPreparingAudio ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Preparing audio...
              </>
            ) : isPlayingAudio ? (
              <>
                <div className="w-5 h-5 mr-2 relative">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-ping" />
                  <div className="absolute inset-0 border-2 border-white rounded-full" />
                </div>
                Playing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2 fill-current" />
                Play Welcome
              </>
            )}
          </Button>

          {/* Continue and Skip */}
          <div className="flex items-center gap-4">
            <Button
              onClick={continueToMaxina}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Continue
            </Button>
            <span className="text-white/40">•</span>
            <button
              onClick={handleSkip}
              className="text-white/60 hover:text-white/90 text-sm underline-offset-4 hover:underline transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Hints - Desktop only */}
      <div className="absolute bottom-6 left-0 right-0 text-center hidden md:block">
        <p className="text-white/40 text-xs">
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Space</kbd> to play • <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Esc</kbd> to skip
        </p>
      </div>

      {/* Mobile-only fixed ORB - centered, docked above bottom nav */}
      <MobileFixedOrb />
    </div>
  );
}
