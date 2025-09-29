import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from '@/utils/performanceOptimization';

type PopupType = 'wallet-generic' | 'wallet-integrated' | 'wallet-master' | null;

interface PopupState {
  type: PopupType;
  priority: number;
  context?: {
    recipient?: { id: string; name: string; avatar?: string };
    conversationId?: string;
  };
}

const POPUP_PRIORITIES = {
  'wallet-integrated': 100, // Highest - conversation context
  'wallet-master': 50,     // Medium - main wallet page
  'wallet-generic': 10,    // Lowest - sidebar/general
};

class PopupCoordinator {
  private currentPopup: PopupState | null = null;
  private listeners = new Set<() => void>();
  private popupQueue: Array<{type: PopupType, context?: PopupState['context']}> = [];
  
  // Debounced notification to prevent excessive re-renders
  private debouncedNotify = debounce(() => {
    this.listeners.forEach(callback => callback());
  }, 50);

  setPopup(type: PopupType, context?: PopupState['context']): boolean {
    if (!type) {
      this.currentPopup = null;
      this.processQueue();
      this.debouncedNotify();
      return true;
    }

    const priority = POPUP_PRIORITIES[type] || 0;
    
    // Allow if no popup is active or new popup has higher priority
    if (!this.currentPopup || priority >= this.currentPopup.priority) {
      this.currentPopup = { type, priority, context };
      this.debouncedNotify();
      return true;
    }

    // Queue lower priority popups instead of blocking them
    this.popupQueue.push({ type, context });
    return false;
  }
  
  private processQueue(): void {
    if (this.popupQueue.length > 0 && !this.currentPopup) {
      const next = this.popupQueue.shift();
      if (next) {
        this.setPopup(next.type, next.context);
      }
    }
  }

  getCurrentPopup(): PopupState | null {
    return this.currentPopup;
  }

  clearPopup(type: PopupType): void {
    if (this.currentPopup?.type === type) {
      this.currentPopup = null;
      this.processQueue();
      this.debouncedNotify();
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.debouncedNotify();
  }
}

const popupCoordinator = new PopupCoordinator();

export function usePopupCoordination() {
  const [, forceUpdate] = useState({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Subscribe to coordinator changes
  useEffect(() => {
    return popupCoordinator.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  const requestPopup = useCallback((
    type: PopupType, 
    context?: PopupState['context']
  ): boolean => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Always request popup immediately for better UX
    return popupCoordinator.setPopup(type, context);
  }, []);

  const clearPopup = useCallback((type: PopupType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    popupCoordinator.clearPopup(type);
  }, []);

  const getCurrentPopup = useMemo(() => {
    return () => popupCoordinator.getCurrentPopup();
  }, []);

  const isPopupActive = useCallback((type: PopupType) => {
    return popupCoordinator.getCurrentPopup()?.type === type;
  }, []);

  const canShowPopup = useCallback((type: PopupType) => {
    const current = popupCoordinator.getCurrentPopup();
    if (!current) return true;
    
    const priority = POPUP_PRIORITIES[type] || 0;
    return priority >= current.priority;
  }, []);

  return {
    requestPopup,
    clearPopup,
    getCurrentPopup,
    isPopupActive,
    canShowPopup
  };
}