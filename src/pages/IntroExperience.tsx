import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { getIntroVideoSrc, markIntroAsSeen } from '@/utils/introVideo';

import { useSoundscape } from '@/context/SoundscapeContext';

import { LanguageToggleButton } from '@/components/ui/language-toggle-button';
import { useTranslation } from '@/hooks/useTranslation';
// `t` from i18n-toast would shadow the local `const { t } = useTranslation()` below;
// using `lookup` (the same singleton, different name) avoids the conflict.
import { lookup } from '@/lib/i18n-toast';

export default function IntroExperience() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();

  // Add body classes for Maxina-specific orb positioning. `maxina-intro-page`
  // is more specific than `maxina-signin-page` (also carried by the sign-in
  // page, MaxinaPortal.tsx) so this screen alone can float the orb near the
  // vertical center instead of docking it to the bottom edge.
  useEffect(() => {
    document.body.classList.add('maxina-signin-page', 'maxina-intro-page');
    return () => {
      document.body.classList.remove('maxina-signin-page', 'maxina-intro-page');
    };
  }, []);
  const { startFresh } = useSoundscape();
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // The Orb is an external widget (window.VitanaOrb) loaded via a deferred
  // <script> from the gateway repo — it takes a beat to fetch/execute before
  // its floating button even exists in the DOM, so the CSS that centers it
  // has nothing to act on at first paint. With the Orb now the visual
  // centerpiece of an otherwise-empty band (rather than a small bottom-docked
  // FAB), that gap read as broken. Poll for the same FAB selector
  // OrbDiscoveryHint uses elsewhere on this app, and show a soft placeholder
  // glow in its place until it actually appears.
  //
  // A live screenshot round showed the placeholder itself being mistaken for
  // "the redesigned Orb" — the detection interval never fired in that
  // session, so the placeholder simply never went away. Two changes address
  // that: a hard timeout so it can never linger indefinitely regardless of
  // whether detection succeeds, and treating a `vtorb-hidden` FAB (the
  // widget's own "not actually visible yet" state, same check
  // OrbDiscoveryHint's sync() uses) as not ready either.
  const [orbReady, setOrbReady] = useState(false);
  useEffect(() => {
    const FAB_SELECTOR =
      '.vtorb-fab, [class^="vtorb-fab"], .vitana-orb, #vitana-orb-fab, [data-vitana-orb="true"]';
    const READY_TIMEOUT_MS = 3000;
    const checkReady = () => {
      const fab = document.querySelector<HTMLElement>(FAB_SELECTOR);
      if (!fab || fab.classList.contains('vtorb-hidden')) return false;
      const rect = fab.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    if (checkReady()) {
      setOrbReady(true);
      return;
    }
    const interval = window.setInterval(() => {
      if (checkReady()) {
        setOrbReady(true);
        window.clearInterval(interval);
      }
    }, 200);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setOrbReady(true);
    }, READY_TIMEOUT_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  // We need BOTH the catalog object `t` (for `t.intro?.X` dotted access below)
  // AND the function-call form (`lookup('screens.foo.bar')`) for newer i18n
  // keys. The function form is imported as `lookup` (not `t`) so the local
  // destructured `t` doesn't shadow it.
  const { t } = useTranslation();

  // Hoisted above the Orb-placement effect below, which depends on these
  // strings: a language switch re-wraps the headline and moves the reserved
  // spacer, so the measurement has to be redone. Declaration order is the
  // only reason this sits here rather than with the other hooks.
  const taglineMain = t.intro?.taglineMain;
  const taglineSub = t.intro?.taglineSub;
  const tapOrbHint = t.intro?.tapOrbHint;

  // The Orb is positioned via a fixed-position CSS override (it's an
  // external widget with no JS positioning API — see index.css), which
  // previously used a static `top: 50%` guess. That guess doesn't know
  // where the surrounding text actually ends up (the two content blocks
  // aren't the same height), so it has repeatedly landed the Orb either in
  // dead empty space or on top of the language pill. Instead, reserve real
  // layout space for the Orb with this spacer and measure ITS rendered
  // center, then feed that back to the CSS as custom properties. The Orb's
  // target position now always matches wherever this spacer actually is,
  // for any content length, viewport size, or breakpoint — no more guessing.
  //
  // BOOTSTRAP-INTRO-ORB-SYMMETRY: this effect was correct in design and
  // COULD NEVER RUN. Its dependency array was `[]`, and this component
  // returns a bare loader until `videoSrc` resolves — so on the one pass it
  // ever made, the spacer was not in the tree, `orbSpacerRef.current` was
  // null, it bailed at the guard below, and nothing re-ran it. Neither
  // custom property was ever set, so the CSS fell through to its
  // `top: 50%` fallback: the exact static guess this effect exists to
  // replace. Measured on staging, where the Orb sat at 50.4% of the
  // viewport and landed on the Serbian sub-tagline.
  //
  // `videoSrc` in the deps is what makes it fire. The rest of the deps
  // cover reflows the ResizeObserver cannot see: the observer fires on the
  // spacer's own SIZE changing, but a longer translation moves the spacer
  // without resizing it.
  const orbSpacerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const spacer = orbSpacerRef.current;
    if (!spacer) return;

    const syncOrbTarget = () => {
      const rect = spacer.getBoundingClientRect();
      // A zero-size read means "not laid out yet" (or the page is hidden).
      // Publishing it would fling the Orb into the top-left corner, so keep
      // the last good value instead.
      if (rect.width === 0 && rect.height === 0) return;
      document.body.style.setProperty(
        '--maxina-orb-target-left',
        `${rect.left + rect.width / 2}px`,
      );
      document.body.style.setProperty(
        '--maxina-orb-target-top',
        `${rect.top + rect.height / 2}px`,
      );
    };

    syncOrbTarget();
    const resizeObserver = new ResizeObserver(syncOrbTarget);
    resizeObserver.observe(spacer);
    window.addEventListener('resize', syncOrbTarget);
    window.addEventListener('orientationchange', syncOrbTarget);

    // Webfonts land after first paint and re-wrap the headline, which moves
    // the spacer. Without this the Orb is placed against fallback-font
    // metrics and stays there.
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => { if (!cancelled) syncOrbTarget(); }).catch(() => {});
    }

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncOrbTarget);
      window.removeEventListener('orientationchange', syncOrbTarget);
      document.body.style.removeProperty('--maxina-orb-target-left');
      document.body.style.removeProperty('--maxina-orb-target-top');
    };
  }, [videoSrc, taglineMain, taglineSub, tapOrbHint]);

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

  const continueToMaxina = useCallback((tab?: 'signin' | 'signup') => {
    if (tenantSlug) {
      markIntroAsSeen(tenantSlug);
    }

    setFadeOut(true);
    setTimeout(() => {
      // Forward query params (e.g. ?redirectTo=/comm/media-hub?short=<id>)
      // so the portal's post-login flow can return the user to their original
      // deep-link target instead of dropping them on the default home page.
      // MaxinaPortal defaults to the sign-in tab, so `tab` is only ever set
      // to steer toward sign-up.
      const params = new URLSearchParams(window.location.search);
      if (tab === 'signup') {
        params.set('tab', 'signup');
      }
      const qs = params.toString();
      navigate(`/${tenantSlug}${qs ? `?${qs}` : ''}`, { replace: true });
    }, 800);
  }, [tenantSlug, navigate]);

  const handleLogin = useCallback(() => {
    continueToMaxina();
  }, [continueToMaxina]);

  const handleRegister = useCallback(() => {
    continueToMaxina('signup');
  }, [continueToMaxina]);

  // Kept as an alias to the login path so the Escape-key shortcut below is unaffected.
  const handleSkip = handleLogin;

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

      {/* Content - a single centered column with a reserved spacer between
          the two text blocks for the separately-positioned Orb (see the
          orbSpacerRef effect above). Two earlier layouts both failed: a
          plain justify-center clustered everything, including the language
          selector, into the same band a fixed-position Orb also targeted,
          so the Orb sat directly on top of the pill; a justify-between
          split fixed the collision but flung both blocks to the viewport
          edges, producing large, disconnected empty gaps on tall phones.
          Centering the whole column with a modest, explicit gap keeps the
          composition as one cohesive block, matching the reference. */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center gap-6 md:gap-8 min-h-screen px-6 py-12 transition-opacity duration-[1000ms] maxina-page-content ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}

        data-maxina-app="true"
      >
        {/* Top block: eyebrow, brand wordmark, tagline */}
        <div className="flex flex-col items-center">
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
            className="text-lg md:text-xl font-light text-white/70 text-center italic tracking-wide animate-fade-in"
            style={{ animationDelay: '2100ms', animationFillMode: 'both' }}
          >
            {t.intro?.taglineSub || 'together with us!'}
          </p>
        </div>

        {/* Reserved space for the Orb — no visible content. Its rendered
            center is measured (see orbSpacerRef above) and fed to the CSS
            that positions the actual, separately-mounted Orb widget, so the
            two blocks below never have to guess where it will land.

            Its height is DERIVED (`--maxina-orb-slot` = orb + 2 × gap), not
            hand-tuned. It used to be `h-28 md:h-36` with a note saying to
            tune the number if the spacing looked wrong — but a hand-set
            height and a separately-set orb size drift apart the moment
            either changes, and the drift shows up as asymmetric spacing.
            Deriving it means the gap above the Orb and the gap below it are
            the same number by construction, in every language. Change
            `--maxina-orb-size`/`--maxina-orb-gap` in index.css, not this. */}
        <div ref={orbSpacerRef} aria-hidden="true" className="maxina-orb-slot w-full" />

        {/* Bottom block: language selector, Login/Register actions. The Orb
            caption used to open this block, but it visually read as
            belonging to the language pill below it rather than the Orb
            above it — moved out to its own fixed-position element pinned
            directly under the Orb (see below).

            Extra top margin (on top of the column's own gap-6/gap-8) nudges
            this block further down the page, into the empty space below it
            on typical viewports. Safe to add here rather than by re-tuning
            the column's overall justify-content: the Orb's target position
            is measured from orbSpacerRef's actual rendered rect (see that
            effect above), so it automatically follows wherever this extra
            space pushes the layout — no separate position fix needed. */}
        <div
          className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-xs mt-10 md:mt-14"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {/* Language selector - glass bar with a globe icon, the current
              language name, and a chevron; opens a full-screen picker. */}
          <LanguageToggleButton />

          {/* Login / Register - primary next-step actions, side by side.
              Login is the brand-gold primary (default returning-user path);
              Register is the secondary glass action, matching the language
              pill above it. Both reuse continueToMaxina's fade+navigate,
              only differing in which MaxinaPortal tab they land on. */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={handleLogin}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-gradient-to-b from-[#F3E2B0] to-[#D9B873] text-[#241c11] shadow-[0_8px_24px_rgba(224,170,82,0.35)] hover:brightness-105 transition-[filter] duration-200"
            >
              <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="flex flex-col items-start text-start leading-tight">
                <span className="text-sm font-bold">{t.intro?.login || 'Login'}</span>
                <span className="text-xs font-medium opacity-80">
                  {t.intro?.loginSubtitle || 'Welcome back!'}
                </span>
              </span>
            </button>

            <button
              onClick={handleRegister}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/25 text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-white/20 transition-colors duration-200"
            >
              <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="flex flex-col items-start text-start leading-tight">
                <span className="text-sm font-bold">{t.intro?.register || 'Register'}</span>
                <span className="text-xs font-medium text-white/70">
                  {t.intro?.registerSubtitle || 'Create your account'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Hints - Desktop only */}
      <div className="absolute bottom-6 left-0 right-0 text-center hidden md:block">
        <p className="text-white/40 text-xs">
          {lookup('screens.introexperience.press')} <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">{lookup('screens.introexperience.esc')}</kbd>{lookup('screens.introexperience.skip')}
        </p>
      </div>

      {/* Orb caption - pinned directly under the (separately,
          fixed-position) Orb widget rather than flowed in the bottom block,
          so it reads as the Orb's own caption instead of the language
          pill's neighbour. Anchored off the same --maxina-orb-target-left/
          -top custom properties the Orb itself uses (see the orbSpacerRef
          effect above and the CSS in index.css), offset down by half the
          Orb's current size + a small gap — both vars are breakpoint-aware,
          so this tracks the Orb through every viewport/resize without a
          separate measurement. Tapping the Orb is the only way to hear
          Vitana speak the welcome; no play/audio control lives in this
          stack any more. */}
      {/* Positioning and the fade-in animation are deliberately split across
          two elements: .animate-fade-in's keyframes animate `transform`
          (translateY, for the fade-up motion), and a CSS animation's
          transform REPLACES an inline transform on the same element rather
          than composing with it — so translateX(-50%) here would get
          silently clobbered by the animation's own translateY once it
          completes. Keeping translateX on the outer (unanimated) element
          and the animation on the inner span avoids the conflict. */}
      <p
        className="fixed z-20 pointer-events-none w-full max-w-xs px-6 text-center"
        style={{
          left: 'var(--maxina-orb-target-left, 50%)',
          top: 'calc(var(--maxina-orb-target-top, 50%) + var(--maxina-orb-size, 96px) / 2 + 12px)',
          transform: 'translateX(-50%)',
        }}
      >
        <span
          className="inline-block text-sm md:text-base font-medium text-white/70 animate-fade-in [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
          style={{ animationDelay: '2800ms', animationFillMode: 'both' }}
        >
          {t.intro?.tapOrbHint || 'Tap the Orb to meet Vitana'}
        </span>
      </p>

      {/* Loading placeholder at the Orb's target spot (see the orbReady
          effect above) — disappears once the real widget is detected, or
          after a fixed timeout regardless, so the center of the screen
          never reads as an empty void while the deferred external script
          loads. Deliberately an outlined, spinning ring rather than a
          filled disc: a solid shape at this exact spot risks being read as
          "the Orb" itself rather than a loading state, which is what
          happened with the earlier filled-gradient version. */}
      {!orbReady && (
        <div
          className="fixed z-30 pointer-events-none"
          style={{
            left: 'var(--maxina-orb-target-left, 50%)',
            top: 'var(--maxina-orb-target-top, 50%)',
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        >
          <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
        </div>
      )}
    </div>
  );
}
