import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { getIntroVideoSrc, markIntroAsSeen } from '@/utils/introVideo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VitanalandPortalSeed } from '@/components/audio/VitanalandPortalSeed';
import { VitanaGuideOrbIntro } from '@/components/vitanaland/VitanaGuideOrbIntro';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { useStreamingState } from '@/context/StreamingStateContext';
import { playSound } from '@/lib/playSound';
import { playLoopingSound, stopAllLoopingSoundsForPath } from '@/lib/playLoopingSound';
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
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [showContent, setShowContent] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientMusicRef = useRef<{ audio: HTMLAudioElement; stop: () => void } | null>(null);
  const ambientFadeFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Smooth fade helper for ambient music
  const fadeAmbientVolume = useCallback(
    (targetVolume: number, duration = 600) => {
      const ambient = ambientMusicRef.current?.audio;
      if (!ambient) return;

      // Cancel any existing fade
      if (ambientFadeFrameRef.current !== null) {
        cancelAnimationFrame(ambientFadeFrameRef.current);
        ambientFadeFrameRef.current = null;
      }

      const startVolume = ambient.volume;
      const volumeDelta = targetVolume - startVolume;
      if (Math.abs(volumeDelta) < 0.001) return;

      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        ambient.volume = startVolume + volumeDelta * t;

        if (t < 1) {
          ambientFadeFrameRef.current = requestAnimationFrame(step);
        } else {
          ambientFadeFrameRef.current = null;
        }
      };

      ambientFadeFrameRef.current = requestAnimationFrame(step);
    },
    []
  );

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

  // Start ambient music when video loads
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (videoSrc && !ambientMusicRef.current) {
      // Small delay to ensure any lingering cleanup has completed
      timer = setTimeout(() => {
        if (!ambientMusicRef.current) {
          ambientMusicRef.current = playLoopingSound(
            "/sounds/vitanaland/maxina-ambient-music.mp3",
            0.04
          );
        }
      }, 100);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      if (ambientFadeFrameRef.current !== null) {
        cancelAnimationFrame(ambientFadeFrameRef.current);
      }
      if (ambientMusicRef.current) {
        ambientMusicRef.current.stop();
        ambientMusicRef.current = null;
      }
      // Only local cleanup in useEffect
    };
  }, [videoSrc]);

  // Smoothly fade ambient music when TTS is playing
  useEffect(() => {
    if (ambientMusicRef.current) {
      if (isPlayingAudio) {
        fadeAmbientVolume(0.015, 600);
      } else {
        fadeAmbientVolume(0.04, 800);
      }
    }
  }, [isPlayingAudio, fadeAmbientVolume]);

  const continueToMaxina = useCallback(() => {
    // Stop music BEFORE navigation
    if (ambientMusicRef.current) {
      ambientMusicRef.current.stop();
      ambientMusicRef.current = null;
    }
    // Global cleanup as safety net
    stopAllLoopingSoundsForPath("/sounds/vitanaland/maxina-ambient-music.mp3");
    
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
    
    // Stop ambient music before navigation
    if (ambientMusicRef.current) {
      ambientMusicRef.current.stop();
      ambientMusicRef.current = null;
    }
    // Global cleanup as safety net
    stopAllLoopingSoundsForPath("/sounds/vitanaland/maxina-ambient-music.mp3");
    
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
  }, [continueToMaxina]);

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
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

      {/* Content */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 transition-opacity duration-[1000ms] ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Title */}
        <h1 
          className="text-5xl md:text-6xl font-bold text-white text-center mb-6 animate-fade-in"
          style={{ animationDelay: '1200ms', animationFillMode: 'both' }}
        >
          Welcome to Vitanaland.
        </h1>

        {/* Subtitle */}
        <p 
          className="text-xl md:text-2xl text-white/90 text-center max-w-2xl mb-8 animate-fade-in"
          style={{ animationDelay: '2000ms', animationFillMode: 'both' }}
        >
          You're entering the Maxina experience.
        </p>

        {/* Caption */}
        <p 
          className="text-base text-white/70 text-center max-w-xl mb-12 animate-fade-in"
          style={{ animationDelay: '2400ms', animationFillMode: 'both' }}
        >
          Where your wellness, connection, and purpose come together.
        </p>

        {/* Controls */}
        <div 
          className="flex flex-col items-center gap-6 animate-fade-in"
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

      {/* Keyboard Hints */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/40 text-xs">
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Space</kbd> to play • <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Esc</kbd> to skip
        </p>
      </div>

      {/* Mini VITANA Orb - Bottom Right Corner Assistant */}
      <VitanaGuideOrbIntro onOrbClick={handleOrbClick} initialDelay={1} />
    </div>
  );
}
