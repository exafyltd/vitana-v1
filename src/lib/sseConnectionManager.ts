/**
 * SSE Connection Manager
 * Prevents connection leaks and allows force-closing all sessions
 */

class SSEConnectionManager {
  private connections: Map<string, EventSource> = new Map();
  private connectionCount = 0;

  register(url: string, eventSource: EventSource): string {
    const id = `sse-${++this.connectionCount}-${Date.now()}`;
    this.connections.set(id, eventSource);
    console.log(`[SSE Manager] Registered connection ${id} to ${url} (Total: ${this.connections.size})`);
    return id;
  }

  unregister(id: string) {
    const es = this.connections.get(id);
    if (es) {
      es.close();
      this.connections.delete(id);
      console.log(`[SSE Manager] Unregistered connection ${id} (Total: ${this.connections.size})`);
    }
  }

  closeAll() {
    console.log(`[SSE Manager] Force closing ${this.connections.size} connections`);
    this.connections.forEach((es, id) => {
      try {
        es.close();
        console.log(`[SSE Manager] Closed connection ${id}`);
      } catch (e) {
        console.warn(`[SSE Manager] Failed to close ${id}:`, e);
      }
    });
    this.connections.clear();
    console.log(`[SSE Manager] All connections closed`);
  }

  // Remove connections that are already closed to prevent leaks and UI confusion
  private sweepClosed(context: string = 'sweep') {
    let removed = 0;
    this.connections.forEach((es, id) => {
      if (es.readyState === 2 /* CLOSED */) {
        this.connections.delete(id);
        removed++;
      }
    });
    if (removed > 0) {
      console.log(`[SSE Manager] ${context}: pruned ${removed} closed connection(s). Active: ${this.connections.size}`);
    }
  }

  getActiveCount(): number {
    this.sweepClosed('getActiveCount');
    return this.connections.size;
  }

  getConnectionInfo(): Array<{ id: string; url: string; readyState: number }> {
    this.sweepClosed('getConnectionInfo');
    return Array.from(this.connections.entries()).map(([id, es]) => ({
      id,
      url: es.url,
      readyState: es.readyState
    }));
  }
}

// Singleton instance
export const sseManager = new SSEConnectionManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).sseManager = sseManager;
}
