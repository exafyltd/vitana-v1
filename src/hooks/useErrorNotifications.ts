import { useState } from 'react';

export interface ErrorNotification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

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
    setErrors(prev => [...prev, newError]);
  };
  
  const dismissError = (id: string) => {
    console.log('[ERROR] Dismissing error:', id);
    setErrors(prev => prev.filter(e => e.id !== id));
  };
  
  return { errors, showError, dismissError };
};
