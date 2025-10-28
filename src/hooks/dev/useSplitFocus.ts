import { useState, useEffect, useCallback } from 'react';
import { SplitFocusState } from '@/types/command-hub';

export function useSplitFocus(): SplitFocusState {
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left');
  const [hasUnreadLeft, setHasUnreadLeft] = useState(false);
  const [hasUnreadRight, setHasUnreadRight] = useState(false);

  const setFocus = useCallback((pane: 'left' | 'right') => {
    setFocusedPane(pane);
    // Auto-mark as read when focused
    if (pane === 'left') setHasUnreadLeft(false);
    if (pane === 'right') setHasUnreadRight(false);
  }, []);

  const markRead = useCallback((pane: 'left' | 'right') => {
    if (pane === 'left') setHasUnreadLeft(false);
    if (pane === 'right') setHasUnreadRight(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        setFocus('left');
      } else if (e.key === '2') {
        e.preventDefault();
        setFocus('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocus('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocus('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setFocus]);

  return {
    focusedPane,
    setFocus,
    hasUnreadLeft,
    hasUnreadRight,
    markRead,
  };
}
