import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveScreen, resolveModule, MODULE_DESCRIPTIONS, type ScreenMeta, type ScreenModule } from '@/lib/screen-registry';

const MAX_HISTORY = 10;

export interface ScreenContextState {
  /** Current screen metadata (null if route not in registry) */
  current: ScreenMeta | null;
  /** Current module */
  module: ScreenModule;
  /** Human-readable module description */
  moduleDescription: string;
  /** Previous screen metadata */
  previous: ScreenMeta | null;
  /** How long (ms) the user has been on the current screen */
  dwellTime: number;
  /** Last N screens visited (most recent first) */
  history: ScreenMeta[];
  /** Raw pathname */
  pathname: string;
  /** Formatted context string ready for AI injection */
  toContextString: () => string;
}

/**
 * Tracks which screen the user is currently viewing and maintains navigation history.
 * Provides a serializable context string for injection into AI prompts.
 */
export function useScreenContext(): ScreenContextState {
  const location = useLocation();
  const [current, setCurrent] = useState<ScreenMeta | null>(null);
  const [previous, setPrevious] = useState<ScreenMeta | null>(null);
  const [history, setHistory] = useState<ScreenMeta[]>([]);
  const [dwellTime, setDwellTime] = useState(0);

  const screenEnteredAt = useRef(Date.now());
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Resolve screen on route change
  useEffect(() => {
    const newScreen = resolveScreen(location.pathname);

    // Only update if screen actually changed
    if (newScreen?.id !== current?.id) {
      setPrevious(current);
      setCurrent(newScreen);
      screenEnteredAt.current = Date.now();
      setDwellTime(0);

      if (newScreen) {
        setHistory(prev => {
          const next = [newScreen, ...prev.filter(s => s.id !== newScreen.id)];
          return next.slice(0, MAX_HISTORY);
        });
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dwell time ticker (updates every 5s to avoid excessive re-renders)
  useEffect(() => {
    dwellIntervalRef.current = setInterval(() => {
      setDwellTime(Date.now() - screenEnteredAt.current);
    }, 5000);

    return () => {
      if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
    };
  }, []);

  const module = resolveModule(location.pathname);
  const moduleDescription = MODULE_DESCRIPTIONS[module] || '';

  const toContextString = useCallback(() => {
    const lines: string[] = ['=== SCREEN CONTEXT ==='];

    if (current) {
      lines.push(`Current Screen: ${current.name} (${current.id})`);
      lines.push(`Module: ${module} — ${moduleDescription}`);
      lines.push(`Screen Description: ${current.description}`);

      const seconds = Math.floor((Date.now() - screenEnteredAt.current) / 1000);
      if (seconds > 5) {
        const duration = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        lines.push(`Time on Screen: ${duration}`);
      }

      if (current.capabilities.length > 0) {
        lines.push(`Available Actions: ${current.capabilities.join(', ')}`);
      }

      lines.push(`AI Guidance: ${current.promptHint}`);
    } else {
      lines.push(`Current Path: ${location.pathname}`);
      lines.push(`Module: ${module} — ${moduleDescription}`);
    }

    if (previous) {
      lines.push(`Previous Screen: ${previous.name} (${previous.id})`);
    }

    if (history.length > 2) {
      const trail = history.slice(0, 5).map(s => s.name).join(' → ');
      lines.push(`Navigation Trail: ${trail}`);
    }

    return lines.join('\n');
  }, [current, previous, history, module, moduleDescription, location.pathname]);

  return {
    current,
    module,
    moduleDescription,
    previous,
    dwellTime,
    history,
    pathname: location.pathname,
    toContextString,
  };
}
