import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface SessionSnapshot {
  id: string;
  timestamp: number;
  tab: string;
  subtab?: string;
  context?: string;
  duration: number;
  path: string;
  scrollPosition?: number;
  vtid?: string;
  filters?: Record<string, any>;
}

const STORAGE_KEY = "vitana_dev_sessions";
const MAX_SESSIONS = 5;

export function useSessionRestore() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSnapshot[]>([]);

  // Load sessions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse sessions:", e);
      }
    }
  }, []);

  // Save a new session
  const saveSession = (session: Omit<SessionSnapshot, "id" | "timestamp">) => {
    const newSession: SessionSnapshot = {
      ...session,
      id: `session_${Date.now()}`,
      timestamp: Date.now(),
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev].slice(0, MAX_SESSIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Restore a session
  const restoreSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Navigate to the saved path
    navigate(session.path);

    // Restore scroll position after a short delay
    if (session.scrollPosition !== undefined) {
      setTimeout(() => {
        window.scrollTo({ top: session.scrollPosition, behavior: "smooth" });
      }, 100);
    }

    // Store additional context for components to read
    sessionStorage.setItem("restored_session", JSON.stringify(session));
  };

  // Clear all sessions
  const clearAllSessions = () => {
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Get the most recent session
  const getMostRecentSession = () => {
    return sessions[0] || null;
  };

  return {
    sessions,
    saveSession,
    restoreSession,
    clearAllSessions,
    getMostRecentSession,
  };
}
