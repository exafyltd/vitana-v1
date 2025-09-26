import { useState, useCallback, useRef, useEffect } from 'react';

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

  setPopup(type: PopupType, context?: PopupState['context']): boolean {
    if (!type) {
      this.currentPopup = null;
      this.notifyListeners();
      return true;
    }

    const priority = POPUP_PRIORITIES[type] || 0;
    
    // Allow if no popup is active or new popup has higher priority
    if (!this.currentPopup || priority >= this.currentPopup.priority) {
      this.currentPopup = { type, priority, context };
      this.notifyListeners();
      return true;
    }

    return false; // Popup blocked by higher priority popup
  }

  getCurrentPopup(): PopupState | null {
    return this.currentPopup;
  }

  clearPopup(type: PopupType): void {
    if (this.currentPopup?.type === type) {
      this.currentPopup = null;
      this.notifyListeners();
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
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
    context?: PopupState['context'],
    options?: { delay?: number }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const trySetPopup = () => {
        const success = popupCoordinator.setPopup(type, context);
        resolve(success);
      };

      if (options?.delay) {
        timeoutRef.current = setTimeout(trySetPopup, options.delay);
      } else {
        trySetPopup();
      }
    });
  }, []);

  const clearPopup = useCallback((type: PopupType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    popupCoordinator.clearPopup(type);
  }, []);

  const getCurrentPopup = useCallback(() => {
    return popupCoordinator.getCurrentPopup();
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