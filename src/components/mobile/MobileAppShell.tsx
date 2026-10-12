import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TopAppBar } from './TopAppBar';
import { SideDrawerNav } from './SideDrawerNav';
import { useWindowOverlay } from '@/navigation/overlay-bus';
import { useNavigate } from 'react-router-dom';
import { calendarTargetFor, type CalendarOpenTab } from '@/components/calendar/calendar-entry';

interface MobileAppShellProps {
  children: React.ReactNode;
}

export function MobileAppShell({ children }: MobileAppShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });

  // BOOTSTRAP-MOBILE-NAV-CONTAINMENT: global `calendar:open` listener for mobile.
  // The only other listener (UniversalCalendarButton) lives in the desktop
  // sidebar, which is not mounted on mobile.
  const navigate = useNavigate();

  // VTID-04528 / VTID-04915: the calendar is the /calendar screen and the
  // reminders list is /reminders (inside the app shell); the popup is retired.
  useWindowOverlay<{ tab?: CalendarOpenTab }>('calendar:open', (detail) => {
    navigate(calendarTargetFor(detail?.tab));
  }, isMobile);

  // VTID-05081: native listeners, not React props. The kept-alive News content is
  // a portal rendered outside this shell's React tree (NewsKeepAlive.tsx), so
  // React touch events from it never reach here; native events bubble through
  // the DOM, where the portal's node sits inside this <div>.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
      if (touchStart.current.x < 30 && deltaX > 50 && deltaX > deltaY) {
        setDrawerOpen(true);
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [isMobile]);

  if (!isMobile) return <>{children}</>;

  return (
    <>
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <SideDrawerNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div
        ref={contentRef}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
      >
        {children}
      </div>
    </>
  );
}
