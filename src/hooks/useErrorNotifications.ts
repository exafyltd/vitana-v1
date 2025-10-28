import { useState, useEffect } from 'react';

export interface ErrorNotification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

const AUTO_DISMISS_DELAY = 10000; // 10 seconds
const MAX_VISIBLE_ERRORS = 5;

export const useErrorNotifications = () => {
  const [errors, setErrors] = useState<ErrorNotification[]>([]);
  
  const showError = (title: string, description: string) => {
    // Check if this exact error already exists and is visible
    const existing = errors.find(
      e => e.title === title && e.description === description
    );
    
    if (existing) {
      console.log('[ERROR] Already shown, skipping:', title);
      return;
    }
    
    // Add new error
    const newError: ErrorNotification = {
      id: `error-${Date.now()}-${Math.random()}`,
      title,
      description,
      timestamp: Date.now()
    };
    
    console.log('[ERROR] Showing new error:', title);
    setErrors(prev => {
      const updated = [...prev, newError];
      // Keep only the most recent errors if we exceed the limit
      return updated.slice(-MAX_VISIBLE_ERRORS);
    });
  };
  
  const dismissError = (id: string) => {
    console.log('[ERROR] Dismissing error:', id);
    setErrors(prev => prev.filter(e => e.id !== id));
  };
  
  const clearAllErrors = () => {
    console.log('[ERROR] Clearing all errors');
    setErrors([]);
  };
  
  // Auto-dismiss errors after delay
  useEffect(() => {
    if (errors.length === 0) return;
    
    const timers = errors.map(error => {
      const timeElapsed = Date.now() - error.timestamp;
      const remainingTime = Math.max(0, AUTO_DISMISS_DELAY - timeElapsed);
      
      return setTimeout(() => {
        dismissError(error.id);
      }, remainingTime);
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [errors]);
  
  return { errors, showError, dismissError, clearAllErrors };
};
