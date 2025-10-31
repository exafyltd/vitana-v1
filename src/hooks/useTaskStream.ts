/**
 * Task Stream Hook - Real-Time SSE/WebSocket Integration
 */

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/state/taskStore";
import { fetchTasks, pollTasks } from "@/lib/taskApi";
import { Task } from "@/types/task";

const STREAM_URL = import.meta.env.VITE_GATEWAY_BASE || "https://oasis-operator-86804897789.us-central1.run.app";
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_BACKOFF = 30000; // 30 seconds

export function useTaskStream() {
  const { addTask, updateTask, removeTask, setConnectionState, setTasks } = useTaskStore();
  const stopRef = useRef<(() => void) | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    let aborted = false;
    let backoff = 1000;
    let isPolling = false;

    // Initial data load
    fetchTasks().then((tasks) => {
      if (!aborted) {
        setTasks(tasks);
        if (tasks.length > 0) {
          lastUpdateRef.current = tasks[0].updated_at;
        }
      }
    });

    const startPolling = () => {
      if (isPolling) return;
      isPolling = true;
      console.log("⚠️ Starting polling fallback");
      
      pollingRef.current = setInterval(async () => {
        const updates = await pollTasks(lastUpdateRef.current);
        if (updates.length > 0) {
          updates.forEach((task) => {
            addTask(task);
            lastUpdateRef.current = task.updated_at;
          });
        }
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPolling = false;
    };

    const connectStream = () => {
      if (aborted) return;
      
      try {
        const es = new EventSource(`${STREAM_URL}/api/v1/tasks/stream`);
        
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
          es.close();
          
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
        
        stopRef.current = () => {
          es.close();
          stopPolling();
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
      stopRef.current?.();
      stopPolling();
    };
  }, [addTask, updateTask, removeTask, setConnectionState, setTasks]);
}
