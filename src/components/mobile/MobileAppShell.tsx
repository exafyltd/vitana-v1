import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TopAppBar } from './TopAppBar';
import { SideDrawerNav } from './SideDrawerNav';

interface MobileAppShellProps {
  children: React.ReactNode;
}

export function MobileAppShell({ children }: MobileAppShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <>
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <SideDrawerNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}>{children}</div>
    </>
  );
}
