import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getIntroVideoSrc, markIntroAsSeen } from '@/utils/introVideo';

import { useSoundscape } from '@/context/SoundscapeContext';

import { LanguageToggleButton } from '@/components/ui/language-toggle-button';
import OrbDiscoveryHint from '@/components/vitanaland/OrbDiscoveryHint';
import { useTranslation } from '@/hooks/useTranslation';
// `t` from i18n-toast would shadow the local `const { t } = useTranslation()` below;
// using `lookup` (the same singleton, different name) avoids the conflict.
import { lookup } from '@/lib/i18n-toast';

export default function IntroExperience() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();

  // Add body class for Maxina-specific orb positioning
  useEffect(() => {
    document.body.classList.add('maxina-signin-page');
    return () => {
      document.body.classList.remove('maxina-signin-page');
    };
  }, []);
  const { startFresh } = useSoundscape();
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const continueToMaxina = useCallback(() => {
    if (tenantSlug) {
      markIntroAsSeen(tenantSlug);
    }

    setFadeOut(true);
    setTimeout(() => {
      // Forward query params (e.g. ?redirectTo=/comm/media-hub?short=<id>)
      // so the portal's post-login flow can return the user to their original
      // deep-link target instead of dropping them on the default home page.
      const qs = window.location.search;
      navigate(`/${tenantSlug}${qs}`, { replace: true });
    }, 800);
  }, [tenantSlug, navigate]);

  const handleSkip = useCallback(() => {
    continueToMaxina();
  }, [continueToMaxina]);

  // We need BOTH the catalog object `t` (for `t.intro?.X` dotted access below)
  // AND the function-call form (`lookup('screens.foo.bar')`) for newer i18n
  // keys. The function form is imported as `lookup` (not `t`) so the local
  // destructured `t` doesn't shadow it.
  const { t } = useTranslation();

  // Keyboard shortcut - must be after function declarations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

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

        {/* Brand block - MAXINA wordmark + Experience, with a soft golden flare accent */}
        <div className="relative">
          {/* Primary Title - MAXINA in ALL CAPS, champagne/ivory gradient for contrast + brand presence */}
          <h1
            className="relative text-3xl md:text-4xl font-bold text-center mb-1 animate-fade-in leading-tight tracking-tight uppercase bg-gradient-to-b from-[#FBF3DE] via-[#F3E2B0] to-[#D9B873] bg-clip-text text-transparent [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))_drop-shadow(0_0_16px_rgba(235,205,150,0.35))]"
            style={{ animationDelay: '1600ms', animationFillMode: 'both' }}
          >
            MAXINA
          </h1>

          {/* Signature Subtitle */}
          <p
            className="relative text-base md:text-lg font-light text-white/80 text-center mb-2 animate-fade-in italic tracking-wide"
            style={{ animationDelay: '1800ms', animationFillMode: 'both' }}
          >
            {t.intro?.experience || 'Experience'}
          </p>

          {/* Golden shine flare - refined glint: thin champagne streak + luminous center + soft cinematic bloom, sits right under Experience as part of the brand block */}
          <div
            className="relative w-28 md:w-36 h-3 mx-auto mb-7 animate-fade-in"
            style={{ animationDelay: '1900ms', animationFillMode: 'both' }}
          >
            {/* Ambient warm bloom - soft, wide, distinct from the sharp center point */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full blur-lg opacity-70"
              style={{
                background:
                  'radial-gradient(circle, rgba(250,230,180,0.6) 0%, rgba(224,170,82,0.28) 50%, transparent 75%)',
              }}
            />
            {/* Thin champagne-gold streak, strongest at center fading to transparent at both ends */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 h-px m-auto bg-gradient-to-r from-transparent via-[#E0AA52] to-transparent" />
            {/* Small bright luminous point */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#FFFDF6] shadow-[0_0_6px_2px_rgba(250,235,190,0.9)]" />
          </div>
        </div>

        {/* Purpose statement - dominant headline + smaller supporting line */}
        <p
          className="text-4xl md:text-5xl font-bold text-white text-center leading-tight tracking-tight text-balance max-w-xs md:max-w-sm mb-1 animate-fade-in"
          style={{ animationDelay: '2000ms', animationFillMode: 'both' }}
        >
          {t.intro?.taglineMain || 'Start your Longevity Journey'}
        </p>
        <p
          className="text-lg md:text-xl font-light text-white/70 text-center italic tracking-wide mb-10 animate-fade-in"
          style={{ animationDelay: '2100ms', animationFillMode: 'both' }}
        >
          {t.intro?.taglineSub || 'together with us!'}
        </p>

        {/* CTA Stack: language selector (occupies the former Play Welcome slot)
            + Go to Login. The Orb itself is a separate, globally-positioned
            widget (see OrbDiscoveryHint) — tapping it is now the only way to
            hear Vitana speak the welcome, so no play/audio control lives here
            any more. */}
        <div
          className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-xs"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {/* Language selector - subtle glass bar showing the current flag,
              language name, and a chevron (VTID-03580's full GA language list,
              in a wider "bar" presentation instead of the old circular badge). */}
          <LanguageToggleButton variant="bar" />

          {/* Go to Login - independent secondary text action, unchanged */}
          <button
            onClick={handleSkip}
            className="text-[#F5ECD8] hover:text-white text-sm font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,0.55)] transition-colors duration-200 underline underline-offset-4"
          >
            {t.intro?.goToLogin || 'Go to Login'}
          </button>
        </div>
      </div>

      {/* Keyboard Hints - Desktop only */}
      <div className="absolute bottom-6 left-0 right-0 text-center hidden md:block">
        <p className="text-white/40 text-xs">
          {lookup('screens.introexperience.press')} <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">{lookup('screens.introexperience.esc')}</kbd>{lookup('screens.introexperience.skip')}
        </p>
      </div>

      <OrbDiscoveryHint />
    </div>
  );
}
