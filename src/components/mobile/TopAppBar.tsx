import { MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { getInstantTenantName } from '@/lib/tenant-display';
import { useSoundscape } from '@/context/SoundscapeContext';
import { t } from '@/lib/i18n-toast';

interface TopAppBarProps {
  onMenuClick: () => void;
}

export function TopAppBar({ onMenuClick }: TopAppBarProps) {
  const { tenant } = useTenant();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // SoundscapeProvider wraps the whole app (App.tsx), so this context read is
  // always safe here.
  const soundscape = useSoundscape();

  // Deterministic branding: prefer instant slug from URL/localStorage over async tenant context
  // This prevents "Earthlinks" flash during Maxina OAuth hydration
  const instantName = getInstantTenantName(pathname);
  const tenantName = instantName || tenant?.name || '';
  const resolvedSlug = instantName ? instantName.toLowerCase() : tenant?.slug;
  const isMaxina = resolvedSlug === 'maxina';
  const isInLiveRoom = pathname.startsWith('/comm/live-rooms/') || pathname.startsWith('/community/live-rooms/');

  // Live entry point lives in the App Bar. Hidden while already inside a live
  // room so the centered title stays balanced.
  const showLive = !isInLiveRoom;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 ${isMaxina ? 'maxina-topbar' : ''}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {!isMaxina && (
        <div className="absolute inset-0 bg-background border-b border-border" />
      )}

      {/* 3-column grid, not absolute-centering: the right-hand group grew (Mute
          is now unconditional, not just Live) and its width varies further by
          locale ("LIVE" vs "En direct"). Absolute-centering the tenant name
          against the full header width doesn't know about that and can drive
          it into an overlap on narrow viewports.
          The two flanking columns are BOTH `1fr` (not `auto`) on purpose: two
          equal-fr tracks split the remaining space evenly regardless of how
          much either side's content actually needs, so the auto-sized title
          column sits visually centered in the normal case — unlike auto/1fr/
          auto, where the wider right side would drag the middle column (and
          thus the title) off-center. Grid tracks still never overlap, so this
          keeps the non-overlap guarantee; only in extreme cases (very narrow
          viewport + a long tenant/live label) does a flanking column need to
          grow past its fair share, which is when the title's own truncation
          below takes over instead. */}
      <div className="relative h-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
        {/* Kebab menu – left. Always shown (incl. Guided Mode) so the side
            navigation drawer is reachable from the App Bar in every mode. */}
        <button
          onClick={onMenuClick}
          className="relative z-10 justify-self-start flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
          aria-label={t('screens.mobile.openNavigationMenu')}
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {/* Tenant name – centered within the remaining space, truncating
            rather than overlapping the side controls if it's ever too long. */}
        <span
          className={`relative z-10 min-w-0 justify-self-center truncate leading-none select-none ${isMaxina ? 'font-medium tracking-[0.18em] text-[21px] text-white/[0.92]' : 'font-semibold tracking-[0.08em] text-[20px]'}`}
          style={!isMaxina ? { color: 'var(--foreground, inherit)' } : undefined}
        >
          {tenantName.toUpperCase()}
        </span>

        {/* Right side: mute toggle (always shown — the only always-visible
            chrome, so this is where "turn off background music at any time"
            has to live) plus, when applicable, the Live badge.
            Deliberately NO `min-w-0` here: this column must never shrink
            below what its content needs — Mute has to stay fully visible and
            tappable, not just present in the DOM. All the give under space
            pressure belongs to the title (`min-w-0` + `truncate` above).
            Leaving this column free-sizing keeps its automatic grid minimum
            at its full content width, so it can't be squeezed narrower than
            that — which is also what stops its content from visually
            spilling past its own track into the title's. */}
        <div className="relative z-10 justify-self-end flex items-center gap-1.5">
          <button
            onClick={() => soundscape.toggleMute()}
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors hover:bg-white/10"
            aria-label={soundscape.isMuted ? t('screens.audio.unmute') : t('screens.audio.mute')}
          >
            {soundscape.isMuted ? (
              <VolumeX className="h-[18px] w-[18px]" />
            ) : (
              <Volume2 className="h-[18px] w-[18px]" />
            )}
          </button>

          {/* Live – styled as a recognizable "LIVE" badge (red live dot +
              label) so its purpose reads instantly, à la TikTok. */}
          {showLive && (
            <button
              onClick={() => navigate('/comm/live-rooms')}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 h-6 transition-colors shrink-0 ${isMaxina ? 'border-white/45 text-white hover:bg-white/10' : 'border-foreground/25 hover:bg-foreground/5'}`}
              style={!isMaxina ? { color: 'hsl(var(--foreground))' } : undefined}
              aria-label={t('screens.mobile.openLiveRooms')}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-bold uppercase leading-none tracking-wide whitespace-nowrap">
                {t('mobileNav.live')}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
