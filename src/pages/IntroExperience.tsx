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

const MAXINA_WELCOME_SSML = `<speak>
  Welcome to <phoneme alphabet="ipa" ph="viːˈtɑːnə">VITANA</phoneme> <break time="40ms"/> land.
  You're entering the Maxina experience — where calm begins and energy awakens.
  Let's explore, connect, and feel amazing together.
</speak>`;

export default function IntroExperience() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { expandToFull, showOrb } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  
  // Ensure orb is visible on intro page (fix "sometimes missing" orb)
  useEffect(() => {
    showOrb();
  }, [showOrb]);
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
      
      {/* Premium multi-layer gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {/* Subtle vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

      {/* Content - positioned higher with safe bottom spacing for Orb */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-32 md:pb-6 transition-opacity duration-[1000ms] maxina-page-content ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={ensureSoundscapePlaying}
        data-maxina-app="true"
      >
        {/* Eyebrow - Small, uppercase, tracking-wide */}
        <p 
          className="text-xs md:text-sm font-medium text-white/60 text-center mb-3 animate-fade-in uppercase tracking-[0.2em]"
          style={{ animationDelay: '1200ms', animationFillMode: 'both' }}
        >
          Welcome to Vitanaland
        </p>

        {/* Primary Title - Bold, clean, centered */}
        <h1 
          className="text-3xl md:text-5xl font-bold text-white text-center mb-4 animate-fade-in leading-tight"
          style={{ animationDelay: '1600ms', animationFillMode: 'both' }}
        >
          Maxina Experience
        </h1>

        {/* Subtitle - One line, tighter */}
        <p 
          className="text-sm md:text-base text-white/70 text-center max-w-[280px] mb-10 animate-fade-in leading-snug"
          style={{ animationDelay: '2000ms', animationFillMode: 'both' }}
        >
          Your longevity, health, and community — guided.
        </p>

        {/* CTA Stack - Premium glass buttons */}
        <div 
          className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-xs"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {/* Primary Play Button - Premium glass style */}
          <Button
            onClick={handlePlayAudio}
            disabled={isPlayingAudio || isPreparingAudio}
            size="lg"
            className="relative w-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white border border-white/30 rounded-2xl px-8 py-5 text-base font-medium shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300"
          >
            {isPreparingAudio ? (
              <>
                <Loader2 className="w-5 h-5 mr-2.5 animate-spin" />
                Preparing...
              </>
            ) : isPlayingAudio ? (
              <>
                <div className="w-5 h-5 mr-2.5 relative">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-ping" />
                  <div className="absolute inset-0 border-2 border-white rounded-full" />
                </div>
                Playing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2.5 fill-current" />
                Play Welcome
              </>
            )}
          </Button>

          {/* Secondary buttons - Small pill style */}
          <div className="flex items-center justify-center gap-3 w-full">
            <Button
              onClick={continueToMaxina}
              variant="ghost"
              className="flex-1 text-white/90 hover:text-white bg-white/5 hover:bg-white/15 border border-white/20 rounded-full px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-all duration-200"
            >
              Continue
            </Button>
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="flex-1 text-white/70 hover:text-white/90 bg-transparent hover:bg-white/10 border border-white/10 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200"
            >
              Skip
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard Hints - Desktop only */}
      <div className="absolute bottom-6 left-0 right-0 text-center hidden md:block">
        <p className="text-white/40 text-xs">
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Space</kbd> to play • <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Esc</kbd> to skip
        </p>
      </div>

      {/* Mobile-only fixed ORB - positioned via global CSS */}
      <MobileFixedOrb />

      {/* Desktop ORB - bottom-left matching sidebar position */}
      <div className="hidden md:block fixed bottom-5 left-[104px] z-40">
        <div
          role="button"
          tabIndex={0}
          onClick={handleOrbClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOrbClick();
            }
          }}
          className="p-3 h-[72px] w-[72px] rounded-full cursor-pointer"
        >
          <VitanalandPortalSeed 
            audioState="idle"
            volumeLevel={0}
            size="sm"
            layoutId="vitana-orb-desktop-intro"
          />
        </div>
      </div>
    </div>
  );
}
