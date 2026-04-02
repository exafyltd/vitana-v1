import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { useStreamingState } from './StreamingStateContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveScreen, resolveModule, MODULE_DESCRIPTIONS, type ScreenMeta, type ScreenModule } from '@/lib/screen-registry';

const MAX_SCREEN_HISTORY = 10;

interface ScreenContextData {
  /** Current screen metadata */
  current: ScreenMeta | null;
  /** Current module */
  module: ScreenModule;
  /** Module description */
  moduleDescription: string;
  /** Previous screen */
  previous: ScreenMeta | null;
  /** Timestamp when user entered current screen */
  enteredAt: number;
  /** Navigation history (most recent first) */
  history: ScreenMeta[];
  /** Serialized context string for AI injection */
  toContextString: () => string;
}

interface VitanalandNavigationState {
  // Visual state
  isExpanded: boolean; // false = mini orb, true = full experience
  worldVisible: boolean; // show dreamlike background

  // First-time experience
  isFirstVisit: boolean; // auto-show full experience on first load

  // Orb visibility control
  orbVisible: boolean; // hide on full-screen modes

  // Active scene tracking
  activeSceneIndex: number;

  // Screen awareness
  screenContext: ScreenContextData;

  // Actions
  expandToFull: () => void; // mini → full + activate audio
  minimizeToOrb: () => void; // full → mini
  hideOrb: () => void; // for full-screen modes
  showOrb: () => void; // restore after full-screen
  setActiveSceneIndex: (index: number) => void;
}

const VitanalandNavigationContext = createContext<VitanalandNavigationState | undefined>(undefined);

// Routes where orb should be hidden
const hideOrbRoutes = [
  '/video-player/*',
  '/live-classes/*',
  '/camera-capture',
  '/meditation-player/*',
  '/onboarding/*',
  '/payment-checkout',
  '/kyc-verification',
  '/auth',
  '/login',
  '/register',
];

interface VitanalandNavigationProviderProps {
  children: ReactNode;
}

export function VitanalandNavigationProvider({ children }: VitanalandNavigationProviderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [worldVisible, setWorldVisible] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [orbVisible, setOrbVisible] = useState(true);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isExpanding, setIsExpanding] = useState(false);

  // Screen awareness tracking
  const [currentScreen, setCurrentScreen] = useState<ScreenMeta | null>(null);
  const [previousScreen, setPreviousScreen] = useState<ScreenMeta | null>(null);
  const [screenHistory, setScreenHistory] = useState<ScreenMeta[]>([]);
  const screenEnteredAtRef = useRef(Date.now());

  const location = useLocation();
  const { setAudioOverlayVisible, audioOverlayVisible } = useStreamingState();
  const idleTimeoutRef = useRef<NodeJS.Timeout>();
  const hasExpandedRef = useRef(false);

  // Check first visit on mount
  useEffect(() => {
    const checkFirstVisit = async () => {
      const lastSeen = localStorage.getItem('vitanaland_last_seen');
      const today = new Date().toDateString();
      
      // Show on first visit of the day, only on /home or root
      if (lastSeen !== today && (location.pathname === '/home' || location.pathname === '/')) {
        // Check authentication before showing world
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is authenticated, show full experience
          setIsFirstVisit(true);
          setIsExpanded(true);
          setWorldVisible(true);
          
          // Auto-minimize after 10 seconds
          setTimeout(() => {
            if (!hasExpandedRef.current) {
              minimizeToOrb();
            }
          }, 10000);
        } else {
          // Not authenticated, just mark as seen
          localStorage.setItem('vitanaland_last_seen', today);
        }
      }
    };
    
    checkFirstVisit();
  }, []);

  // Check route visibility
  useEffect(() => {
    const shouldHide = hideOrbRoutes.some(pattern => 
      matchPath(pattern, location.pathname)
    );
    
    setOrbVisible(!shouldHide);
  }, [location.pathname]);

  // Resolve screen context on route change
  useEffect(() => {
    const newScreen = resolveScreen(location.pathname);
    if (newScreen?.id !== currentScreen?.id) {
      setPreviousScreen(currentScreen);
      setCurrentScreen(newScreen);
      screenEnteredAtRef.current = Date.now();
      if (newScreen) {
        setScreenHistory(prev => {
          const next = [newScreen, ...prev.filter(s => s.id !== newScreen.id)];
          return next.slice(0, MAX_SCREEN_HISTORY);
        });
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build serializable screen context
  const screenContextToString = useCallback(() => {
    const lines: string[] = ['=== SCREEN CONTEXT ==='];
    const mod = resolveModule(location.pathname);
    const modDesc = MODULE_DESCRIPTIONS[mod] || '';

    if (currentScreen) {
      lines.push(`Current Screen: ${currentScreen.name} (${currentScreen.id})`);
      lines.push(`Module: ${mod} — ${modDesc}`);
      lines.push(`Screen Description: ${currentScreen.description}`);
      const seconds = Math.floor((Date.now() - screenEnteredAtRef.current) / 1000);
      if (seconds > 5) {
        const duration = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        lines.push(`Time on Screen: ${duration}`);
      }
      if (currentScreen.capabilities.length > 0) {
        lines.push(`Available Actions: ${currentScreen.capabilities.join(', ')}`);
      }
      lines.push(`AI Guidance: ${currentScreen.promptHint}`);
    } else {
      lines.push(`Current Path: ${location.pathname}`);
      lines.push(`Module: ${mod} — ${modDesc}`);
    }

    if (previousScreen) {
      lines.push(`Previous Screen: ${previousScreen.name} (${previousScreen.id})`);
    }

    if (screenHistory.length > 2) {
      const trail = screenHistory.slice(0, 5).map(s => s.name).join(' → ');
      lines.push(`Navigation Trail: ${trail}`);
    }

    return lines.join('\n');
  }, [currentScreen, previousScreen, screenHistory, location.pathname]);

  const screenContext: ScreenContextData = {
    current: currentScreen,
    module: resolveModule(location.pathname),
    moduleDescription: MODULE_DESCRIPTIONS[resolveModule(location.pathname)] || '',
    previous: previousScreen,
    enteredAt: screenEnteredAtRef.current,
    history: screenHistory,
    toContextString: screenContextToString,
  };

  // Idle detection (2.5 minutes)
  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    idleTimeoutRef.current = setTimeout(() => {
      if (!audioOverlayVisible && !isExpanded && orbVisible) {
        setIsExpanded(true);
        setWorldVisible(true);
        
        // Auto-minimize after 15 seconds if no interaction
        setTimeout(() => {
          if (!audioOverlayVisible) {
            minimizeToOrb();
          }
        }, 15000);
      }
    }, 150000); // 2.5 minutes
  }, [audioOverlayVisible, isExpanded, orbVisible]);

  // Track user activity
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    
    resetIdleTimer(); // Start timer
    
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [resetIdleTimer]);

  const expandToFull = useCallback(() => {
    setIsExpanded(true);
    setWorldVisible(true);
    setIsExpanding(true);
    hasExpandedRef.current = true;
    
    // Activate Audio Screen after world fades in
    setTimeout(() => {
      setAudioOverlayVisible(true);
      setIsExpanding(false);
    }, 800);
  }, [setAudioOverlayVisible]);

  const minimizeToOrb = useCallback(() => {
    setWorldVisible(false);
    
    // Delay orb minimize to allow smooth world fade
    setTimeout(() => {
      setIsExpanded(false);
    }, 600);
    
    // Mark as seen today
    localStorage.setItem('vitanaland_last_seen', new Date().toDateString());
    setIsFirstVisit(false);
  }, []);

  const hideOrb = useCallback(() => {
    setOrbVisible(false);
  }, []);

  const showOrb = useCallback(() => {
    setOrbVisible(true);
  }, []);

  // Auto-minimize when audio overlay closes (but not during initial expansion)
  useEffect(() => {
    if (!audioOverlayVisible && isExpanded && !isExpanding) {
      minimizeToOrb();
    }
  }, [audioOverlayVisible, isExpanded, isExpanding, minimizeToOrb]);

  return (
    <VitanalandNavigationContext.Provider
      value={{
        isExpanded,
        worldVisible,
        isFirstVisit,
        orbVisible,
        activeSceneIndex,
        screenContext,
        expandToFull,
        minimizeToOrb,
        hideOrb,
        showOrb,
        setActiveSceneIndex,
      }}
    >
      {children}
    </VitanalandNavigationContext.Provider>
  );
}

export function useVitanalandNavigation() {
  const context = useContext(VitanalandNavigationContext);
  if (!context) {
    throw new Error('useVitanalandNavigation must be used within VitanalandNavigationProvider');
  }
  return context;
}
