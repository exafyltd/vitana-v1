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
      className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-3"
      style={
        isMaxina
          ? {
              background:
                'linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)',
              color: 'rgba(255,255,255,0.95)',
            }
          : undefined
      }
    >
      {!isMaxina && (
        <div className="absolute inset-0 bg-background border-b border-border" />
      )}

      {/* Kebab menu – left */}
      <button
        onClick={onMenuClick}
        className="relative z-10 flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-white/10"
        aria-label="Open navigation menu"
      >
        <MoreVertical className="h-6 w-6" />
      </button>

      {/* Tenant name – centered */}
      <span
        className="absolute left-1/2 -translate-x-1/2 z-10 font-semibold tracking-wider text-sm select-none"
        style={!isMaxina ? { color: 'var(--foreground, inherit)' } : undefined}
      >
        {tenantName.toUpperCase()}
      </span>

      {/* Right spacer for symmetry */}
      <div className="w-10 ml-auto" />
    </header>
  );
}
