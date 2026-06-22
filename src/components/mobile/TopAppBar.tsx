import { MoreVertical } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { getInstantTenantName } from '@/lib/tenant-display';
import { t } from '@/lib/i18n-toast';
import { useGuidedMode } from '@/context/GuidedModeProvider';

interface TopAppBarProps {
  onMenuClick: () => void;
}

export function TopAppBar({ onMenuClick }: TopAppBarProps) {
  const { tenant } = useTenant();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isGuided } = useGuidedMode(); // VTID-03279: hide menu dots in Guided Mode

  // Deterministic branding: prefer instant slug from URL/localStorage over async tenant context
  // This prevents "Earthlinks" flash during Maxina OAuth hydration
  const instantName = getInstantTenantName(pathname);
  const tenantName = instantName || tenant?.name || '';
  const resolvedSlug = instantName ? instantName.toLowerCase() : tenant?.slug;
  const isMaxina = resolvedSlug === 'maxina';
  const isInLiveRoom = pathname.startsWith('/comm/live-rooms/') || pathname.startsWith('/community/live-rooms/');

  // Live entry point lives in the App Bar (replaces the old mute toggle, which
  // moved into the side drawer). Hidden while already inside a live room so the
  // centered title stays balanced.
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

      <div className="relative h-8 flex items-center px-3">
        {/* Kebab menu – left. VTID-03279: hidden in Guided Mode (no menu dots);
            a spacer keeps the centered title balanced. Users reach account/settings
            by switching to Full App via the My Journey segmented switch. */}
        {isGuided ? (
          <div className="w-8 h-8" />
        ) : (
          <button
            onClick={onMenuClick}
            className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
            aria-label={t('screens.mobile.openNavigationMenu')}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        )}

        {/* Tenant name – centered */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-10 leading-none select-none ${isMaxina ? 'font-medium tracking-[0.18em] text-[21px] text-white/[0.92]' : 'font-semibold tracking-[0.08em] text-[20px]'}`}
          style={!isMaxina ? { color: 'var(--foreground, inherit)' } : undefined}
        >
          {tenantName.toUpperCase()}
        </span>

        {/* Live – right. Styled as a recognizable "LIVE" badge (red live dot +
            label) so its purpose reads instantly, à la TikTok. */}
        {showLive ? (
          <button
            onClick={() => navigate('/comm/live-rooms')}
            className={`relative z-10 ml-auto flex items-center gap-1.5 rounded-full border px-2.5 h-6 transition-colors ${isMaxina ? 'border-white/45 text-white hover:bg-white/10' : 'border-foreground/25 hover:bg-foreground/5'}`}
            style={!isMaxina ? { color: 'hsl(var(--foreground))' } : undefined}
            aria-label={t('screens.mobile.openLiveRooms')}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase leading-none tracking-wide">
              {t('mobileNav.live')}
            </span>
          </button>
        ) : (
          <div className="w-8 ml-auto" />
        )}
      </div>
    </header>
  );
}
