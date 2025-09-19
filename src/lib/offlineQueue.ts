import { type MessageKind } from '@/hooks/useHybridMessages';

export interface QueueItem {
  idempotency_key: string;
  thread_id: string;
  context: 'global' | 'tenant';
  kind: MessageKind;
  payload: {
    content: string;
    message_type?: string;
    content_data?: any;
    action_buttons?: any[];
    attachments?: any[];
  };
  created_at: string;
  attempts: number;
  status: 'queued' | 'sending' | 'failed' | 'sent';
  next_retry_at?: string;
  error_message?: string;
}

class OfflineQueueStorage {
  private dbName = 'vitana_message_queue';
  private dbVersion = 1;
  private storeName = 'outbox';
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    if (this.db) return;
    
    try {
      this.db = await this.openIndexedDB();
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage fallback:', error);
      // IndexedDB not available, will use localStorage fallback
    }
  }
  
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'idempotency_key' });
          store.createIndex('thread_id', 'thread_id', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }
  
  async addItem(item: QueueItem): Promise<void> {
    if (this.db) {
      return this.addToIndexedDB(item);
    } else {
      return this.addToLocalStorage(item);
    }
  }
  
  private addToIndexedDB(item: QueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private addToLocalStorage(item: QueueItem): Promise<void> {
    try {
      const key = `${this.dbName}_${item.idempotency_key}`;
      localStorage.setItem(key, JSON.stringify(item));
      
      // Also maintain an index for easy retrieval
      const indexKey = `${this.dbName}_index`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      if (!index.includes(item.idempotency_key)) {
        index.push(item.idempotency_key);
        localStorage.setItem(indexKey, JSON.stringify(index));
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  async updateItem(idempotency_key: string, updates: Partial<QueueItem>): Promise<void> {
    if (this.db) {
      return this.updateInIndexedDB(idempotency_key, updates);
    } else {
      return this.updateInLocalStorage(idempotency_key, updates);
    }
  }
  
  private updateInIndexedDB(idempotency_key: string, updates: Partial<QueueItem>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(idempotency_key);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updatedItem = { ...item, ...updates };
          const putRequest = store.put(updatedItem);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
  
  private updateInLocalStorage(idempotency_key: string, updates: Partial<QueueItem>): Promise<void> {
    try {
      const key = `${this.dbName}_${idempotency_key}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const item = JSON.parse(existing);
        const updatedItem = { ...item, ...updates };
        localStorage.setItem(key, JSON.stringify(updatedItem));
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Item not found'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  async getItem(idempotency_key: string): Promise<QueueItem | null> {
    if (this.db) {
      return this.getFromIndexedDB(idempotency_key);
    } else {
      return this.getFromLocalStorage(idempotency_key);
    }
  }
  
  private getFromIndexedDB(idempotency_key: string): Promise<QueueItem | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(idempotency_key);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private getFromLocalStorage(idempotency_key: string): Promise<QueueItem | null> {
    try {
      const key = `${this.dbName}_${idempotency_key}`;
      const item = localStorage.getItem(key);
      return Promise.resolve(item ? JSON.parse(item) : null);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  async getAllItems(): Promise<QueueItem[]> {
    if (this.db) {
      return this.getAllFromIndexedDB();
    } else {
      return this.getAllFromLocalStorage();
    }
  }
  
  private getAllFromIndexedDB(): Promise<QueueItem[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  private getAllFromLocalStorage(): Promise<QueueItem[]> {
    try {
      const indexKey = `${this.dbName}_index`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const items: QueueItem[] = [];
      
      for (const idempotency_key of index) {
        const key = `${this.dbName}_${idempotency_key}`;
        const item = localStorage.getItem(key);
        if (item) {
          try {
            items.push(JSON.parse(item));
          } catch (error) {
            console.warn('Failed to parse queue item:', error);
          }
        }
      }
      
      return Promise.resolve(items);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  async getItemsByStatus(status: QueueItem['status']): Promise<QueueItem[]> {
    const allItems = await this.getAllItems();
    return allItems.filter(item => item.status === status);
  }
  
  async getItemsByThread(thread_id: string): Promise<QueueItem[]> {
    const allItems = await this.getAllItems();
    return allItems.filter(item => item.thread_id === thread_id);
  }
  
  async removeItem(idempotency_key: string): Promise<void> {
    if (this.db) {
      return this.removeFromIndexedDB(idempotency_key);
    } else {
      return this.removeFromLocalStorage(idempotency_key);
    }
  }
  
  private removeFromIndexedDB(idempotency_key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(idempotency_key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private removeFromLocalStorage(idempotency_key: string): Promise<void> {
    try {
      const key = `${this.dbName}_${idempotency_key}`;
      localStorage.removeItem(key);
      
      // Remove from index
      const indexKey = `${this.dbName}_index`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const updatedIndex = index.filter((k: string) => k !== idempotency_key);
      localStorage.setItem(indexKey, JSON.stringify(updatedIndex));
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  async clear(): Promise<void> {
    if (this.db) {
      return this.clearIndexedDB();
    } else {
      return this.clearLocalStorage();
    }
  }
  
  private clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private clearLocalStorage(): Promise<void> {
    try {
      const indexKey = `${this.dbName}_index`;
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      
      for (const idempotency_key of index) {
        const key = `${this.dbName}_${idempotency_key}`;
        localStorage.removeItem(key);
      }
      
      localStorage.removeItem(indexKey);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export const offlineQueueStorage = new OfflineQueueStorage();