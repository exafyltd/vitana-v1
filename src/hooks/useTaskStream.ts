/**
 * Task Stream Hook - Real-Time SSE/WebSocket Integration
 */

import { useEffect, useRef, useState } from "react";
import { useTaskStore } from "@/state/taskStore";
import { fetchTasks, pollTasks } from "@/lib/taskApi";
import { Task } from "@/types/task";
import { sseManager } from "@/lib/sseConnectionManager";
import { GATEWAY_BASE } from '@/lib/gateway-base';

const STREAM_URL = GATEWAY_BASE;
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_BACKOFF = 30000; // 30 seconds

export interface TaskStreamState {
  /** VTID-05063: the gateway answered 401/403 to a task read; polling has stopped. */
  accessDenied: boolean;
}

export function useTaskStream(): TaskStreamState {
  const { addTask, updateTask, removeTask, setConnectionState, setTasks } = useTaskStore();
  const connectionIdRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>(new Date().toISOString());
  const mountedRef = useRef(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Prevent double mount in React Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    let aborted = false;
    let denied = false;
    let backoff = 1000;
    let isPolling = false;

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPolling = false;
    };

    // VTID-05063: 401/403 means this user may not read the task ledger.
    // Asking again every 10 s cannot change that, so polling stops for good.
    const denyAccess = () => {
      if (denied || aborted) return;
      denied = true;
      console.warn("⚠️ Task reads denied (401/403), polling stopped");
      stopPolling();
      setAccessDenied(true);
    };

    // Initial data load
    fetchTasks().then((result) => {
      if (aborted) return;
      if (!result.ok) {
        if (result.reason === "access_denied") {
          denyAccess();
        } else {
          setTasks([]);
        }
        return;
      }
      setTasks(result.tasks);
      if (result.tasks.length > 0) {
        lastUpdateRef.current = result.tasks[0].updated_at;
      }
    });

    const startPolling = () => {
      if (isPolling || denied) return;
      isPolling = true;
      console.log("⚠️ Starting polling fallback");
      
      pollingRef.current = setInterval(async () => {
        const result = await pollTasks(lastUpdateRef.current);
        if (aborted || denied) return;
        if (!result.ok) {
          if (result.reason === "access_denied") denyAccess();
          return;
        }
        const updates = result.tasks;
        if (updates.length > 0) {
          updates.forEach((task) => {
            addTask(task);
            lastUpdateRef.current = task.updated_at;
          });
        }
      }, POLL_INTERVAL);
    };

    const connectStream = () => {
      if (aborted) return;
      
      try {
        const url = `${STREAM_URL}/api/v1/tasks/stream`;
        const es = new EventSource(url);
        connectionIdRef.current = sseManager.register(url, es);
        
        es.onopen = () => {
          console.log("✅ Task stream connected");
          setConnectionState("LIVE");
          backoff = 1000;
          stopPolling();
        };
        
        es.onmessage = (ev) => {
          try {
            const event = JSON.parse(ev.data);
            
            switch (event.kind) {
              case "task.created":
                if (event.data) {
                  addTask(event.data as Task);
                  lastUpdateRef.current = event.data.updated_at;
                }
                break;
                
              case "task.updated":
                if (event.data) {
                  updateTask(event.data.id, event.data);
                  lastUpdateRef.current = event.data.updated_at;
                }
                break;
                
              case "task.deleted":
                if (event.data?.id) {
                  removeTask(event.data.id);
                }
                break;
            }
          } catch (e) {
            console.warn("Failed to parse task stream event:", e);
          }
        };
        
        es.onerror = () => {
          console.warn("⚠️ Task stream error, reconnecting...");
          setConnectionState("RECONNECTING");
          if (connectionIdRef.current) {
            sseManager.unregister(connectionIdRef.current);
            connectionIdRef.current = null;
          }
          
          // Start polling after 10s of being disconnected
          setTimeout(() => {
            if (!aborted && es.readyState !== EventSource.OPEN) {
              startPolling();
            }
          }, POLL_INTERVAL);
          
          // Try to reconnect with exponential backoff
          setTimeout(connectStream, backoff);
          backoff = Math.min(backoff * 2, MAX_BACKOFF);
        };
      } catch (error) {
        console.error("Failed to connect to task stream:", error);
        setConnectionState("OFFLINE");
        startPolling();
      }
    };

    connectStream();
    
    return () => {
      aborted = true;
      mountedRef.current = false;
      if (connectionIdRef.current) {
        sseManager.unregister(connectionIdRef.current);
        connectionIdRef.current = null;
      }
      stopPolling();
    };
  }, [addTask, updateTask, removeTask, setConnectionState, setTasks]);

  return { accessDenied };
}
