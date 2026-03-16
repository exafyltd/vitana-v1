import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2 } from 'lucide-react';
import { getIntroVideoSrc, markIntroAsSeen } from '@/utils/introVideo';

import { toast } from 'sonner';
import { VitanalandPortalSeed } from '@/components/audio/VitanalandPortalSeed';
import { MobileFixedOrb } from '@/components/mobile/MobileFixedOrb';
import { useSoundscape } from '@/context/SoundscapeContext';
import { playSound } from '@/lib/playSound';
import { LanguageToggleButton } from '@/components/ui/language-toggle-button';
import { useTranslation } from '@/hooks/useTranslation';

// Pre-recorded welcome audio paths
const WELCOME_AUDIO_EN = '/sounds/intro/maxina-welcome-en.wav';
const WELCOME_AUDIO_DE = '/sounds/intro/maxina-welcome-de.wav';

export default function IntroExperience() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { showOrb } = useVitanalandNavigation();
  
  // Ensure orb is visible on intro page (fix "sometimes missing" orb)
  useEffect(() => {
    showOrb();
  }, [showOrb]);

  // Add body class for Maxina-specific orb positioning
  useEffect(() => {
    document.body.classList.add('maxina-signin-page');
    return () => {
      document.body.classList.remove('maxina-signin-page');
    };
  }, []);
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

  // Attempt optimistic autoplay on mount (works on desktop/Android, silently blocked on iOS)
  useEffect(() => {
    startFresh();
  }, [startFresh]);

  // iOS fallback: start soundscape on first touch/click (touchstart fires before click on iOS)
  useEffect(() => {
    const startOnFirstTouch = () => {
      startFresh();
      document.removeEventListener('touchstart', startOnFirstTouch);
      document.removeEventListener('click', startOnFirstTouch);
    };
    document.addEventListener('touchstart', startOnFirstTouch, { once: true });
    document.addEventListener('click', startOnFirstTouch, { once: true });
    return () => {
      document.removeEventListener('touchstart', startOnFirstTouch);
      document.removeEventListener('click', startOnFirstTouch);
    };
  }, [startFresh]);

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

    const tryOpenOrb = (attempt = 0) => {
      const orb = (window as any).VitanaOrb;
      if (orb?.open) {
        orb.open();
        return;
      }

      if (attempt < 8) {
        window.setTimeout(() => tryOpenOrb(attempt + 1), 120);
      }
    };

    tryOpenOrb();
  };

  // Get current language for TTS and translations
  const { t, isGerman } = useTranslation();

  const handlePlayPauseAudio = useCallback(async () => {
    // Ensure soundscape starts on user click
    ensureSoundscapePlaying();
    
    // If currently playing, pause it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }
    
    // If audio exists and was paused, resume it
    if (audioRef.current && audioRef.current.paused && audioRef.current.currentTime > 0) {
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }
    
    // Otherwise, play pre-recorded welcome audio
    setIsPreparingAudio(true);
    
    const audioSrc = isGerman ? WELCOME_AUDIO_DE : WELCOME_AUDIO_EN;
    
    try {
      const audio = new Audio(audioSrc);
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
      console.error('Welcome audio error:', error);
      setIsPreparingAudio(false);
      toast.error('Audio unavailable now');
    }
  }, [isPlayingAudio, continueToMaxina, ensureSoundscapePlaying, isGerman]);

  // Keyboard shortcuts - must be after function declarations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isPreparingAudio) {
          handlePlayPauseAudio();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreparingAudio, handlePlayPauseAudio, handleSkip]);

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
        
        data-maxina-app="true"
      >
        {/* Eyebrow - Small, uppercase, tracking-wide */}
        <p 
          className="text-xs md:text-sm font-medium text-white/60 text-center mb-3 animate-fade-in uppercase tracking-[0.2em]"
          style={{ animationDelay: '1200ms', animationFillMode: 'both' }}
        >
          {t.intro?.welcomeTo || 'WELCOME TO VITANALAND'}
        </p>

        {/* Primary Title - MAXINA in ALL CAPS */}
        <h1 
          className="text-4xl md:text-5xl font-bold text-white text-center mb-1 animate-fade-in leading-tight tracking-tight uppercase"
          style={{ animationDelay: '1600ms', animationFillMode: 'both' }}
        >
          MAXINA
        </h1>

        {/* Signature Subtitle */}
        <p 
          className="text-lg md:text-xl font-light text-white/80 text-center mb-6 animate-fade-in italic tracking-wide"
          style={{ animationDelay: '1800ms', animationFillMode: 'both' }}
        >
          {t.intro?.experience || 'Experience'}
        </p>

        {/* Longevity Tagline - Single line */}
        <p 
          className="text-sm md:text-base text-white/70 text-center mb-10 animate-fade-in whitespace-nowrap"
          style={{ animationDelay: '2000ms', animationFillMode: 'both' }}
        >
          {t.intro?.tagline || 'Your longevity journey, guided.'}
        </p>

        {/* CTA Stack - Premium glass buttons */}
        <div 
          className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-xs"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {/* Button row: Play Welcome + Language Toggle */}
          <div className="flex items-center gap-2.5 w-full">
            {/* Primary Play/Pause Button - Premium glass style */}
            <Button
              onClick={handlePlayPauseAudio}
              disabled={isPreparingAudio}
              size="lg"
              className="relative flex-1 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white border border-white/30 rounded-2xl px-8 py-5 text-base font-medium shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300"
            >
              {isPreparingAudio ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2.5 animate-spin" />
                  {t.intro?.preparing || 'Preparing...'}
                </>
              ) : isPlayingAudio ? (
                <>
                  <Pause className="w-5 h-5 mr-2.5" />
                  {t.intro?.playing || 'Playing'}
                  {/* Animated Equalizer Bars */}
                  <div className="flex gap-0.5 items-end h-4 ml-3">
                    <div 
                      className="w-1 bg-white rounded-full animate-[equalizer_0.8s_ease-in-out_0s_infinite]"
                      style={{ height: '4px' }}
                    />
                    <div 
                      className="w-1 bg-white rounded-full animate-[equalizer_0.8s_ease-in-out_0.15s_infinite]"
                      style={{ height: '4px' }}
                    />
                    <div 
                      className="w-1 bg-white rounded-full animate-[equalizer_0.8s_ease-in-out_0.3s_infinite]"
                      style={{ height: '4px' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2.5 fill-current" />
                  {t.intro?.playWelcome || 'Play Welcome'}
                </>
              )}
            </Button>
            
            {/* Language Toggle - circular, shows opposite flag */}
            <LanguageToggleButton size="md" />
          </div>

          {/* Skip intro - secondary text button */}
          <button
            onClick={handleSkip}
            className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors duration-200 underline-offset-4 hover:underline"
          >
            {t.intro?.skipIntro || 'Skip intro'}
          </button>
        </div>

        {/* Equalizer animation keyframes */}
        <style>{`
          @keyframes equalizer {
            0%, 100% { height: 4px; }
            50% { height: 16px; }
          }
        `}</style>
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
