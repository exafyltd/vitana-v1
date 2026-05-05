import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ 
  data, 
  onSave, 
  delay = 2000, 
  enabled = true 
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  const save = useCallback(async (dataToSave: T) => {
    if (isSavingRef.current) return;
    
    try {
      isSavingRef.current = true;
      await onSave(dataToSave);
      lastSavedRef.current = dataToSave;
      
      notify('toasts.hooks.autosaved', 'toasts.hooks.yourChangesHaveSavedAutomatically');
    } catch (error) {
      console.error('Auto-save failed:', error);
      notifyError('toasts.hooks.autosaveFailed', 'toasts.hooks.yourChangesCouldnTSavedPlease');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, toast]);

  useEffect(() => {
    if (!enabled || JSON.stringify(data) === JSON.stringify(lastSavedRef.current)) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, delay, save]);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return save(data);
  }, [data, save]);

  const hasUnsavedChanges = JSON.stringify(data) !== JSON.stringify(lastSavedRef.current);
  const isSaving = isSavingRef.current;

  return {
    forceSave,
    hasUnsavedChanges,
    isSaving
  };
}