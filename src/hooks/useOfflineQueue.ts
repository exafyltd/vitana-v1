/**
 * React hook for managing offline message queue
 */

import { useState, useEffect, useCallback } from 'react';
import { messageOutbox, type OutboxEvent } from '@/lib/messageOutbox';
import { type QueueItem } from '@/lib/offlineQueue';

export interface QueueStats {
  queued: number;
  sending: number;
  failed: number;
  total: number;
  items: QueueItem[];
}

export function useOfflineQueue() {
  const [stats, setStats] = useState<QueueStats>({
    queued: 0,
    sending: 0,
    failed: 0,
    total: 0,
    items: []
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Update queue stats
  const updateStats = useCallback(async () => {
    try {
      const newStats = await messageOutbox.getQueueStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to update queue stats:', error);
    }
  }, []);
  
  // Handle outbox events
  const handleOutboxEvent = useCallback((event: OutboxEvent) => {
    // Update stats when queue changes
    updateStats();
  }, [updateStats]);
  
  // Manual retry function
  const retryItem = useCallback(async (idempotency_key: string) => {
    try {
      await messageOutbox.retryItem(idempotency_key);
    } catch (error) {
      console.error('Failed to retry item:', error);
      throw error;
    }
  }, []);
  
  // Clear entire queue
  const clearQueue = useCallback(async () => {
    try {
      await messageOutbox.clearQueue();
      await updateStats();
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }, [updateStats]);
  
  // Get items for specific thread
  const getThreadItems = useCallback((threadId: string): QueueItem[] => {
    return stats.items.filter(item => item.thread_id === threadId);
  }, [stats.items]);
  
  // Get item by idempotency key
  const getItem = useCallback((idempotency_key: string): QueueItem | undefined => {
    return stats.items.find(item => item.idempotency_key === idempotency_key);
  }, [stats.items]);
  
  useEffect(() => {
    // Initialize outbox and get initial stats
    messageOutbox.init().then(() => {
      updateStats();
    });
    
    // Listen for outbox events
    messageOutbox.addEventListener(handleOutboxEvent);
    
    // Listen for network changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic stats update
    const interval = setInterval(updateStats, 5000);
    
    return () => {
      messageOutbox.removeEventListener(handleOutboxEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [handleOutboxEvent, updateStats]);
  
  return {
    stats,
    isOnline,
    retryItem,
    clearQueue,
    getThreadItems,
    getItem,
    updateStats
  };
}