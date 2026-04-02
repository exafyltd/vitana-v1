import { useEffect } from 'react';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';
import { setScreenContextPayload, type ScreenContextPayload } from '@/lib/getScreenContextPayload';

/**
 * Bridges the React screen context into a global store so that
 * non-React service layers (e.g., aiVoiceService) can access it.
 *
 * Mount this once inside the VitanalandNavigationProvider tree.
 */
export function ScreenContextBridge() {
  const { screenContext } = useVitanalandNavigation();

  useEffect(() => {
    const payload: ScreenContextPayload = {
      screenId: screenContext.current?.id ?? null,
      screenName: screenContext.current?.name ?? null,
      module: screenContext.module,
      moduleDescription: screenContext.moduleDescription,
      description: screenContext.current?.description ?? null,
      capabilities: screenContext.current?.capabilities ?? [],
      promptHint: screenContext.current?.promptHint ?? null,
      previousScreen: screenContext.previous
        ? `${screenContext.previous.name} (${screenContext.previous.id})`
        : null,
      navigationTrail: screenContext.history.length > 2
        ? screenContext.history.slice(0, 5).map(s => s.name).join(' → ')
        : null,
      dwellSeconds: Math.floor((Date.now() - screenContext.enteredAt) / 1000),
      pathname: window.location.pathname,
    };

    setScreenContextPayload(payload);
  }, [screenContext.current?.id, screenContext.previous?.id, screenContext.module]);

  // Cleanup on unmount
  useEffect(() => {
    return () => setScreenContextPayload(null);
  }, []);

  return null;
}
