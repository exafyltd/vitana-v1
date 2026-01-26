import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazy, Suspense, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load tab components for code splitting
const EventsAndMeetups = lazy(() => import("@/pages/community/EventsAndMeetups"));
const BusinessHub = lazy(() => import("@/pages/BusinessHub"));
const LiveRooms = lazy(() => import("@/pages/community/LiveRooms"));
const Profile = lazy(() => import("@/pages/Profile"));

/**
 * MobileTabKeepAlive - Keeps bottom tab screens mounted for instant switching
 * 
 * Benefits:
 * - Preserves scroll position when switching tabs
 * - Maintains component state (forms, selections, etc.)
 * - Enables instant cache hits (useQuery data already loaded)
 * - Uses CSS display:none to hide inactive tabs (no unmount/remount)
 * 
 * Only applies to the 4 bottom navigation destinations:
 * - /comm/events-meetups (Events)
 * - /business (Business Hub)
 * - /comm/live-rooms (Live Rooms)
 * - /me/profile (Profile)
 * 
 * IMPORTANT: This component renders alongside the normal Route element.
 * The Route component still mounts but is replaced visually by the KeepAlive version.
 */
export function MobileTabKeepAlive() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const currentPath = location.pathname;
  
  // Track which tabs have been visited (lazy mount on first visit)
  const mountedTabs = useRef<Set<string>>(new Set());

  // Tab route matching
  const isEventsActive = currentPath.startsWith('/comm/events-meetups');
  const isBusinessActive = currentPath.startsWith('/business');
  const isLiveActive = currentPath.startsWith('/comm/live-rooms') && !currentPath.includes('/view');
  const isProfileActive = currentPath.startsWith('/me/profile');

  // Check if current path is one of the keep-alive tab routes
  const isKeepAliveRoute = isEventsActive || isBusinessActive || isLiveActive || isProfileActive;

  // Mark current tab as visited
  useEffect(() => {
    if (isEventsActive) mountedTabs.current.add('events');
    if (isBusinessActive) mountedTabs.current.add('business');
    if (isLiveActive) mountedTabs.current.add('live');
    if (isProfileActive) mountedTabs.current.add('profile');
  }, [isEventsActive, isBusinessActive, isLiveActive, isProfileActive]);

  // Only render on mobile and for keep-alive routes
  if (!isMobile || !isKeepAliveRoute) {
    return null;
  }

  // Simple loading skeleton for lazy components
  const TabSkeleton = () => (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );

  // Check if a tab has ever been visited (lazy mount)
  const hasVisited = (tab: string) => mountedTabs.current.has(tab);

  return (
    <div className="mobile-keepalive-container fixed inset-0 z-10 bg-background">
      {/* Events Tab - only render if visited or currently active */}
      {(hasVisited('events') || isEventsActive) && (
        <div 
          style={{ display: isEventsActive ? 'block' : 'none' }}
          className="mobile-keepalive-tab h-full overflow-auto"
          data-tab="events"
        >
          <Suspense fallback={<TabSkeleton />}>
            <EventsAndMeetups />
          </Suspense>
        </div>
      )}

      {/* Business Hub Tab */}
      {(hasVisited('business') || isBusinessActive) && (
        <div 
          style={{ display: isBusinessActive ? 'block' : 'none' }}
          className="mobile-keepalive-tab h-full overflow-auto"
          data-tab="business"
        >
          <Suspense fallback={<TabSkeleton />}>
            <BusinessHub />
          </Suspense>
        </div>
      )}

      {/* Live Rooms Tab */}
      {(hasVisited('live') || isLiveActive) && (
        <div 
          style={{ display: isLiveActive ? 'block' : 'none' }}
          className="mobile-keepalive-tab h-full overflow-auto"
          data-tab="live"
        >
          <Suspense fallback={<TabSkeleton />}>
            <LiveRooms />
          </Suspense>
        </div>
      )}

      {/* Profile Tab */}
      {(hasVisited('profile') || isProfileActive) && (
        <div 
          style={{ display: isProfileActive ? 'block' : 'none' }}
          className="mobile-keepalive-tab h-full overflow-auto"
          data-tab="profile"
        >
          <Suspense fallback={<TabSkeleton />}>
            <Profile />
          </Suspense>
        </div>
      )}
    </div>
  );
}
