/**
 * Central message outbox service for reliable offline message delivery
 */

import { offlineQueueStorage, type QueueItem } from './offlineQueue';
import { instrumentRealtimeEvent } from './diagnostics';
import { SendMessageArgs, type MessageKind } from '@/hooks/useHybridMessages';

export type OutboxEventType = 
  | 'queued' 
  | 'retry_start' 
  | 'retry_success' 
  | 'retry_fail' 
  | 'dropped_after_max'
  | 'sent'
  | 'failed';

export interface OutboxEvent {
  type: OutboxEventType;
  idempotency_key: string;
  thread_id: string;
  attempts: number;
  error?: string;
  timestamp: string;
}

class MessageOutboxService {
  private retryWorker: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;
  private isInitialized = false;
  private maxAttempts = 6;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds
  private eventListeners: ((event: OutboxEvent) => void)[] = [];
  
  // Message send functions by context
  private sendFunctions: {
    global?: (args: SendMessageArgs) => Promise<any>;
    tenant?: (args: SendMessageArgs) => Promise<any>;
  } = {};
  
  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    await offlineQueueStorage.init();
    this.setupNetworkListeners();
    this.startRetryWorker();
    
    // Restore and retry queued items on startup
    await this.restoreAndRetryQueue();
    
    this.isInitialized = true;
  }
  
  private setupNetworkListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emitDiagnosticEvent('Network back online, resuming queue processing');
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emitDiagnosticEvent('Network offline, pausing queue processing');
    });
    
    // Listen for visibility changes (tab focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processQueue();
      }
    });
  }
  
  private startRetryWorker(): void {
    // Process queue every 5 seconds
    this.retryWorker = setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
      }
    }, 5000);
  }
  
  private async restoreAndRetryQueue(): Promise<void> {
    try {
      const queuedItems = await offlineQueueStorage.getItemsByStatus('queued');
      const failedItems = await offlineQueueStorage.getItemsByStatus('failed');
      
      const itemsToRetry = [...queuedItems, ...failedItems];
      
      if (itemsToRetry.length > 0) {
        this.emitDiagnosticEvent(`Restored ${itemsToRetry.length} items from queue`);
        
        if (this.isOnline) {
          // Start processing restored items
          this.processQueue();
        }
      }
    } catch (error) {
      console.error('Failed to restore queue:', error);
    }
  }
  
  registerSendFunction(context: 'global' | 'tenant', sendFn: (args: SendMessageArgs) => Promise<any>): void {
    this.sendFunctions[context] = sendFn;
  }
  
  addEventListener(listener: (event: OutboxEvent) => void): void {
    this.eventListeners.push(listener);
  }
  
  removeEventListener(listener: (event: OutboxEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  private emitEvent(event: OutboxEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in outbox event listener:', error);
      }
    });
  }
  
  private emitDiagnosticEvent(message: string, type: 'send' | 'ack' | 'error' = 'ack'): void {
    instrumentRealtimeEvent(type, {
      content: `[OUTBOX] ${message}`,
      threadId: 'outbox-system'
    });
  }
  
  async enqueueMessage(args: SendMessageArgs): Promise<string> {
    await this.init();
    
    const idempotency_key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: QueueItem = {
      idempotency_key,
      thread_id: args.threadId,
      context: args.context,
      kind: this.determineKind(args),
      payload: {
        content: args.content,
        message_type: args.type,
        content_data: args.contentData,
        action_buttons: undefined, // Not supported in outbox yet
        attachments: args.contentData?.attachments
      },
      created_at: new Date().toISOString(),
      attempts: 0,
      status: 'queued'
    };
    
    await offlineQueueStorage.addItem(queueItem);
    
    this.emitEvent({
      type: 'queued',
      idempotency_key,
      thread_id: args.threadId,
      attempts: 0,
      timestamp: new Date().toISOString()
    });
    
    this.emitDiagnosticEvent(`Message queued: ${args.content.substring(0, 50)}...`);
    
    // Try to send immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
    
    return idempotency_key;
  }
  
  private determineKind(args: SendMessageArgs): MessageKind {
    if (args.contentData?.attachments?.length > 0) {
      const firstAttachment = args.contentData.attachments[0];
      if (firstAttachment.type === 'image') return 'image';
      return 'file';
    }
    return 'text';
  }
  
  private async processQueue(): Promise<void> {
    if (!this.isOnline) return;
    
    try {
      // Get items ready for retry (including queued items)
      const queuedItems = await offlineQueueStorage.getItemsByStatus('queued');
      const failedItems = await offlineQueueStorage.getItemsByStatus('failed');
      
      const itemsToProcess = [...queuedItems];
      
      // Add failed items that are ready for retry
      const now = new Date();
      for (const item of failedItems) {
        if (!item.next_retry_at || new Date(item.next_retry_at) <= now) {
          itemsToProcess.push(item);
        }
      }
      
      if (itemsToProcess.length === 0) return;
      
      // Sort by created_at to maintain order per thread
      const sortedItems = itemsToProcess.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Process items sequentially per thread to maintain order
      const threadGroups = this.groupByThread(sortedItems);
      
      for (const [thread_id, items] of threadGroups.entries()) {
        await this.processThreadItems(items);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      this.emitDiagnosticEvent(`Queue processing error: ${error}`, 'error');
    }
  }
  
  private groupByThread(items: QueueItem[]): Map<string, QueueItem[]> {
    const groups = new Map<string, QueueItem[]>();
    
    for (const item of items) {
      if (!groups.has(item.thread_id)) {
        groups.set(item.thread_id, []);
      }
      groups.get(item.thread_id)!.push(item);
    }
    
    return groups;
  }
  
  private async processThreadItems(items: QueueItem[]): Promise<void> {
    for (const item of items) {
      try {
        await this.processItem(item);
      } catch (error) {
        // Continue with next item even if one fails
        console.error(`Failed to process item ${item.idempotency_key}:`, error);
      }
    }
  }
  
  private async processItem(item: QueueItem): Promise<void> {
    // Update status to sending
    await offlineQueueStorage.updateItem(item.idempotency_key, {
      status: 'sending',
      attempts: item.attempts + 1
    });
    
    this.emitEvent({
      type: 'retry_start',
      idempotency_key: item.idempotency_key,
      thread_id: item.thread_id,
      attempts: item.attempts + 1,
      timestamp: new Date().toISOString()
    });
    
    try {
      const sendFn = this.sendFunctions[item.context];
      if (!sendFn) {
        throw new Error(`No send function registered for context: ${item.context}`);
      }
      
      // Prepare send arguments with idempotency key
      const sendArgs: SendMessageArgs = {
        context: item.context,
        threadId: item.thread_id,
        content: item.payload.content,
        type: (item.payload.message_type as MessageKind) || 'text',
        contentData: {
          ...item.payload.content_data,
          idempotency_key: item.idempotency_key // Add idempotency key to prevent duplicates
        },
        recipientId: undefined // Not supported in outbox yet
      };
      
      await sendFn(sendArgs);
      
      // Success - mark as sent and remove from queue
      await offlineQueueStorage.updateItem(item.idempotency_key, {
        status: 'sent'
      });
      
      // Clean up sent items after a delay to allow for reconciliation
      setTimeout(() => {
        offlineQueueStorage.removeItem(item.idempotency_key).catch(console.error);
      }, 10000);
      
      this.emitEvent({
        type: 'sent',
        idempotency_key: item.idempotency_key,
        thread_id: item.thread_id,
        attempts: item.attempts + 1,
        timestamp: new Date().toISOString()
      });
      
      this.emitDiagnosticEvent(
        `Message sent successfully: ${item.payload.content.substring(0, 50)}...`
      );
      
    } catch (error) {
      const newAttempts = item.attempts + 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (newAttempts >= this.maxAttempts) {
        // Max attempts reached - mark as failed permanently
        await offlineQueueStorage.updateItem(item.idempotency_key, {
          status: 'failed',
          attempts: newAttempts,
          error_message: errorMessage
        });
        
        this.emitEvent({
          type: 'dropped_after_max',
          idempotency_key: item.idempotency_key,
          thread_id: item.thread_id,
          attempts: newAttempts,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
        
        this.emitDiagnosticEvent(
          `Message dropped after ${this.maxAttempts} attempts: ${errorMessage}`,
          'error'
        );
      } else {
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, newAttempts - 1),
          this.maxDelay
        );
        
        const nextRetryAt = new Date(Date.now() + delay).toISOString();
        
        await offlineQueueStorage.updateItem(item.idempotency_key, {
          status: 'failed',
          attempts: newAttempts,
          error_message: errorMessage,
          next_retry_at: nextRetryAt
        });
        
        this.emitEvent({
          type: 'retry_fail',
          idempotency_key: item.idempotency_key,
          thread_id: item.thread_id,
          attempts: newAttempts,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
        
        this.emitDiagnosticEvent(
          `Retry ${newAttempts}/${this.maxAttempts} failed, next attempt in ${delay}ms: ${errorMessage}`,
          'error'
        );
      }
    }
  }
  
  async retryItem(idempotency_key: string): Promise<void> {
    const item = await offlineQueueStorage.getItem(idempotency_key);
    if (!item) {
      throw new Error('Item not found');
    }
    
    // Reset retry timer and status
    await offlineQueueStorage.updateItem(idempotency_key, {
      status: 'queued',
      next_retry_at: undefined,
      error_message: undefined
    });
    
    this.emitDiagnosticEvent(`Manual retry triggered for: ${item.payload.content.substring(0, 50)}...`);
    
    // Process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }
  
  async getQueueStats(): Promise<{
    queued: number;
    sending: number;
    failed: number;
    total: number;
    items: QueueItem[];
  }> {
    await this.init();
    
    const allItems = await offlineQueueStorage.getAllItems();
    
    return {
      queued: allItems.filter(item => item.status === 'queued').length,
      sending: allItems.filter(item => item.status === 'sending').length,
      failed: allItems.filter(item => item.status === 'failed').length,
      total: allItems.length,
      items: allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    };
  }
  
  async clearQueue(): Promise<void> {
    await offlineQueueStorage.clear();
    this.emitDiagnosticEvent('Queue cleared');
  }
  
  destroy(): void {
    if (this.retryWorker) {
      clearInterval(this.retryWorker);
      this.retryWorker = null;
    }
    
    window.removeEventListener('online', this.processQueue);
    window.removeEventListener('offline', this.processQueue);
    document.removeEventListener('visibilitychange', this.processQueue);
    
    this.eventListeners.length = 0;
    this.isInitialized = false;
  }
}

export const messageOutbox = new MessageOutboxService();