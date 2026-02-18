import { MoreVertical } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface TopAppBarProps {
  onMenuClick: () => void;
}

export function TopAppBar({ onMenuClick }: TopAppBarProps) {
  const { tenant } = useTenant();

  const isMaxina = tenant?.slug === 'maxina';

  const tenantName = tenant?.name || 'Community';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        ...(isMaxina
          ? {
              background:
                'linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)',
              color: 'rgba(255,255,255,0.95)',
            }
          : undefined),
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
          className="absolute left-1/2 -translate-x-1/2 z-10 font-semibold tracking-[0.08em] text-[20px] select-none"
          style={!isMaxina ? { color: 'var(--foreground, inherit)' } : undefined}
        >
          {tenantName.toUpperCase()}
        </span>

        {/* Right spacer for symmetry */}
        <div className="w-8 ml-auto" />
      </div>
    </header>
  );
}
