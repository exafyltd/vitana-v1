/**
 * VTID-LIVEKIT-FOUNDATION: read the global active-voice-provider flag.
 *
 * The community frontend connects to whichever pipeline is currently the
 * active voice provider. Source of truth is the gateway's
 * GET /api/v1/orb/active-provider endpoint (orb-livekit.ts route).
 *
 * Re-fetched at:
 *   - app boot
 *   - on visibility resume / focus (mobile lockscreen recovery)
 *   - on a 503 provider_standby response from a stale connect attempt
 *
 * Defaults to 'vertex' on network failure — the standby architecture means
 * Vertex is the safe default until the operator deliberately flips.
 */
import { useEffect, useState, useCallback } from "react";

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/+$/, "");

export type ActiveVoiceProvider = "vertex" | "livekit";

interface ActiveProviderState {
  provider: ActiveVoiceProvider;
  lastFlippedAt: string | null;
  flippedBy: string | null;
  loading: boolean;
}

const FETCH_TIMEOUT_MS = 5000;

async function fetchActive(): Promise<{ provider: ActiveVoiceProvider; lastFlippedAt: string | null; flippedBy: string | null }> {
  if (!GATEWAY_URL) {
    return { provider: "vertex", lastFlippedAt: null, flippedBy: null };
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/orb/active-provider`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { provider: "vertex", lastFlippedAt: null, flippedBy: null };
    }
    const body = (await res.json()) as {
      active_provider?: string;
      last_flipped_at?: string | null;
      flipped_by?: string | null;
    };
    const provider: ActiveVoiceProvider = body.active_provider === "livekit" ? "livekit" : "vertex";
    return {
      provider,
      lastFlippedAt: body.last_flipped_at ?? null,
      flippedBy: body.flipped_by ?? null,
    };
  } catch {
    // Network error / timeout — default to Vertex (the safer side).
    return { provider: "vertex", lastFlippedAt: null, flippedBy: null };
  }
}

export function useActiveVoiceProvider(): ActiveProviderState & {
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<ActiveProviderState>({
    provider: "vertex",
    lastFlippedAt: null,
    flippedBy: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const next = await fetchActive();
    setState({ ...next, loading: false });
  }, []);

  useEffect(() => {
    refresh();
    const onResume = () => {
      // Re-fetch on visibility resume / focus (mobile lockscreen recovery).
      void refresh();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [refresh]);

  return { ...state, refresh };
}
