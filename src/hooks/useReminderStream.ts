/**
 * VTID-02601 — Subscribe to the gateway reminder fire stream and surface
 * incoming events through a small in-memory queue. ReminderInterruptOverlay
 * consumes from this hook.
 *
 * Notes:
 * - EventSource cannot send Authorization headers; gateway accepts user_id
 *   query param (same vector as /api/v1/events/stream).
 * - Browser auto-reconnects on transient errors; we add a 30s reset on
 *   non-recoverable errors so we don't hammer the gateway with a tight loop.
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { reminderStreamUrl } from "@/lib/reminders-api";

export interface ReminderFirePayload {
  type: "reminder.fire";
  reminder_id: string;
  action_text: string;
  spoken_message: string;
  description: string | null;
  chime_pcm_b64: string;
  chime_mime: string;
  voice_audio_b64: string | null;
  voice_mime: string;
  voice_lang: string | null;
  fired_at: string;
  next_fire_at: string;
}

export function useReminderStream(): { latestFire: ReminderFirePayload | null; clear: () => void } {
  const { user } = useAuth();
  const userId = user?.id;
  const [latestFire, setLatestFire] = useState<ReminderFirePayload | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let backoff = 1000;
    let retryTimer: number | undefined;

    const connect = () => {
      if (cancelled) return;
      const url = reminderStreamUrl(userId);
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", () => {
        backoff = 1000; // reset on successful handshake
      });

      es.addEventListener("reminder-fire", (ev) => {
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as ReminderFirePayload;
          if (seen.current.has(payload.reminder_id)) return;
          seen.current.add(payload.reminder_id);
          setLatestFire(payload);
        } catch (err) {
          console.warn("[reminder-stream] parse failed", err);
        }
      });

      es.onerror = () => {
        es.close();
        if (cancelled) return;
        retryTimer = window.setTimeout(connect, Math.min(backoff, 30_000));
        backoff *= 2;
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [userId]);

  return {
    latestFire,
    clear: () => setLatestFire(null),
  };
}
