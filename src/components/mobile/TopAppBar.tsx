import { MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { useSoundscape } from '@/context/SoundscapeContext';
import { getInstantTenantName } from '@/lib/tenant-display';

interface TopAppBarProps {
  onMenuClick: () => void;
}

export function TopAppBar({ onMenuClick }: TopAppBarProps) {
  const { tenant } = useTenant();
  const { pathname } = useLocation();

  // Deterministic branding: prefer instant slug from URL/localStorage over async tenant context
  // This prevents "Earthlinks" flash during Maxina OAuth hydration
  const instantName = getInstantTenantName(pathname);
  const tenantName = instantName || tenant?.name || '';
  const resolvedSlug = instantName ? instantName.toLowerCase() : tenant?.slug;
  const isMaxina = resolvedSlug === 'maxina';
  const isInLiveRoom = pathname.startsWith('/comm/live-rooms/') || pathname.startsWith('/community/live-rooms/');

  let soundscapeContext: ReturnType<typeof useSoundscape> | null = null;
  try {
    soundscapeContext = useSoundscape();
  } catch {
    // Context not available yet
  }

  const showMute = !!soundscapeContext && !isInLiveRoom;

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
        {/* Kebab menu – left */}
        <button
          onClick={onMenuClick}
          className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
          aria-label="Open navigation menu"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {/* Tenant name – centered */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-10 leading-none select-none ${isMaxina ? 'font-medium tracking-[0.18em] text-[21px] text-white/[0.92]' : 'font-semibold tracking-[0.08em] text-[20px]'}`}
          style={!isMaxina ? { color: 'var(--foreground, inherit)' } : undefined}
        >
          {tenantName.toUpperCase()}
        </span>

        {/* Mute toggle – right */}
        {showMute ? (
          <button
            onClick={soundscapeContext!.toggleMute}
            className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10 ml-auto"
            aria-label={soundscapeContext!.isMuted ? 'Unmute background music' : 'Mute background music'}
          >
            {soundscapeContext!.isMuted ? (
              <VolumeX className="h-5 w-5" style={!isMaxina ? { color: 'hsl(var(--muted-foreground))' } : undefined} />
            ) : (
              <Volume2 className="h-5 w-5" style={!isMaxina ? { color: 'hsl(var(--foreground))' } : undefined} />
            )}
          </button>
        ) : (
          <div className="w-8 ml-auto" />
        )}
      </div>
    </header>
  );
}
