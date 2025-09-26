import type { GlobalMessage } from './useGlobalMessages';
import type { TenantMessage } from './useTenantMessages';

interface CacheEntry<T> {
  messages: T[];
  fetchedAt: number;
  isStale: boolean;
}

interface InFlightFetch {
  promise: Promise<any>;
  timestamp: number;
}

// Message cache with LRU eviction and deduplication
class MessageCache {
  private cache = new Map<string, CacheEntry<GlobalMessage | TenantMessage>>();
  private inFlightFetches = new Map<string, InFlightFetch>();
  private maxEntries = 10; // Keep last 10 conversations
  private staleThreshold = 30000; // 30 seconds

  private getCacheKey(threadId: string, context: 'global' | 'tenant', tenantId?: string): string {
    return context === 'global' ? `global:${threadId}` : `tenant:${tenantId}:${threadId}`;
  }

  get<T extends GlobalMessage | TenantMessage>(
    threadId: string, 
    context: 'global' | 'tenant', 
    tenantId?: string
  ): T[] | null {
    const key = this.getCacheKey(threadId, context, tenantId);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    // Mark as stale if older than threshold
    const now = Date.now();
    if (now - entry.fetchedAt > this.staleThreshold) {
      entry.isStale = true;
    }
    
    return entry.messages as T[];
  }

  set<T extends GlobalMessage | TenantMessage>(
    threadId: string,
    context: 'global' | 'tenant',
    messages: T[],
    tenantId?: string
  ): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.inFlightFetches.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      messages,
      fetchedAt: Date.now(),
      isStale: false
    });
    
    // Clean up in-flight fetch
    this.inFlightFetches.delete(key);
  }

  isStale(threadId: string, context: 'global' | 'tenant', tenantId?: string): boolean {
    const key = this.getCacheKey(threadId, context, tenantId);
    const entry = this.cache.get(key);
    return entry?.isStale || false;
  }

  has(threadId: string, context: 'global' | 'tenant', tenantId?: string): boolean {
    const key = this.getCacheKey(threadId, context, tenantId);
    return this.cache.has(key);
  }

  // Add a new message to cache (for real-time updates)
  addMessage<T extends GlobalMessage | TenantMessage>(
    threadId: string,
    context: 'global' | 'tenant',
    message: T,
    tenantId?: string
  ): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.messages = [...entry.messages, message];
      entry.fetchedAt = Date.now();
      entry.isStale = false;
    }
  }

  // Update optimistic message in cache
  updateMessage<T extends GlobalMessage | TenantMessage>(
    threadId: string,
    context: 'global' | 'tenant',
    tempId: string,
    realMessage: T,
    tenantId?: string
  ): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.messages = entry.messages.map(msg => 
        msg.id === tempId ? realMessage : msg
      );
    }
  }

  // Remove optimistic message from cache
  removeMessage(threadId: string, context: 'global' | 'tenant', messageId: string, tenantId?: string): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.messages = entry.messages.filter(msg => msg.id !== messageId);
    }
  }

  // Track in-flight fetches to avoid duplicates
  setInFlight(threadId: string, context: 'global' | 'tenant', promise: Promise<any>, tenantId?: string): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    this.inFlightFetches.set(key, {
      promise,
      timestamp: Date.now()
    });
  }

  getInFlight(threadId: string, context: 'global' | 'tenant', tenantId?: string): Promise<any> | null {
    const key = this.getCacheKey(threadId, context, tenantId);
    const inFlight = this.inFlightFetches.get(key);
    
    // Clean up stale in-flight fetches (older than 10 seconds)
    if (inFlight && Date.now() - inFlight.timestamp > 10000) {
      this.inFlightFetches.delete(key);
      return null;
    }
    
    return inFlight?.promise || null;
  }

  // Clear specific thread from cache
  clearThread(threadId: string, context: 'global' | 'tenant', tenantId?: string): void {
    const key = this.getCacheKey(threadId, context, tenantId);
    this.cache.delete(key);
    this.inFlightFetches.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.inFlightFetches.clear();
  }

  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      inFlight: this.inFlightFetches.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const messageCache = new MessageCache();

// Export prefetch helper
export async function prefetchMessages(
  threadId: string,
  context: 'global' | 'tenant',
  fetchFunction: (threadId: string) => Promise<any>,
  tenantId?: string
) {
  // Don't prefetch if already cached and fresh
  if (messageCache.has(threadId, context, tenantId) && !messageCache.isStale(threadId, context, tenantId)) {
    return;
  }

  // Don't prefetch if already in-flight
  const existing = messageCache.getInFlight(threadId, context, tenantId);
  if (existing) {
    return existing;
  }

  // Start prefetch
  const fetchPromise = fetchFunction(threadId);
  messageCache.setInFlight(threadId, context, fetchPromise, tenantId);

  try {
    await fetchPromise;
  } catch (error) {
    console.warn('Prefetch failed for thread:', threadId, error);
  }
}