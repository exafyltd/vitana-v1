import { useState, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TopAppBar } from './TopAppBar';
import { SideDrawerNav } from './SideDrawerNav';
import { EnhancedCalendarPopup } from '@/components/calendar/EnhancedCalendarPopup';
import { useWindowOverlay } from '@/navigation/overlay-bus';
import { useNavigate } from 'react-router-dom';
import { CALENDAR_ROUTE, opensRemindersPopup, type CalendarOpenTab } from '@/components/calendar/calendar-entry';

interface MobileAppShellProps {
  children: React.ReactNode;
}

export function MobileAppShell({ children }: MobileAppShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });

  // BOOTSTRAP-MOBILE-NAV-CONTAINMENT: global `calendar:open` listener for mobile.
  // The only other listener (UniversalCalendarButton) lives in the desktop sidebar,
  // which is not mounted on mobile — so ORB/deep-link `calendar:open` dispatches
  // (e.g. "show my reminders" → Calendar popup on the Reminders tab) were no-ops
  // here, and the navigator fell through to the desktop /reminders page. Mounting
  // the popup at the shell level keeps that redirect inside a real mobile surface.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTab, setCalendarTab] = useState<'agenda' | 'month' | 'reminders' | undefined>(undefined);

  const navigate = useNavigate();

  // VTID-04528: the calendar is the /calendar screen; only a request for the
  // reminders list still opens the popup on its Reminders tab.
  useWindowOverlay<{ tab?: CalendarOpenTab }>('calendar:open', (detail) => {
    if (opensRemindersPopup(detail?.tab)) {
      setCalendarTab(detail?.tab);
      setCalendarOpen(true);
      return;
    }
    navigate(CALENDAR_ROUTE);
  }, isMobile);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    if (touchStart.current.x < 30 && deltaX > 50 && deltaX > deltaY) {
      setDrawerOpen(true);
    }
  }, []);

  if (!isMobile) return <>{children}</>;

  return (
    <>
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <SideDrawerNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
      >
        {children}
      </div>
      <EnhancedCalendarPopup
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        initialMobileTab={calendarTab}
      />
    </>
  );
}
