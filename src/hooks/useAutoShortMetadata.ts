/**
 * useAutoShortMetadata — client-side hook for the Smart Upload flow.
 *
 * Captures 3 keyframes from a chosen video, POSTs them to the gateway's
 * /api/v1/media-hub/shorts/auto-metadata endpoint, and returns structured
 * metadata the upload form can use to pre-fill title / description /
 * category / tags.
 *
 * The hook is designed to be instantiated per video (or per per-card in
 * BulkVideoUploadModal). It's fully abortable and maps server error codes
 * to user-facing messages — failures should always degrade to the manual
 * form, never block upload.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { captureKeyframes, readVideoDuration } from '@/lib/videoKeyframes';

// VITE_GATEWAY_URL in this repo already includes "/api/v1"; VITE_GATEWAY_BASE is bare origin.
// Mirror the pattern from useAIAssistants so we hit the same host.
const GATEWAY_BASE = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || '').replace(/\/api\/v1\/?$/, '') ||
  ''
).replace(/\/+$/, '');

const ENDPOINT = `${GATEWAY_BASE}/api/v1/media-hub/shorts/auto-metadata`;
const POSITIONS = [0.2, 0.5, 0.8];

export type AutoMetadata = {
  title: string;
  description: string;
  category: string;
  tags: string[];
};

export type AutoMetadataErrorCode =
  | 'UNREADABLE_VIDEO'
  | 'NOT_AUTHENTICATED'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'LLM_ERROR'
  | 'NETWORK'
  | 'UNKNOWN';

export type UseAutoShortMetadataResult = {
  generate: (file: File, durationSeconds?: number) => Promise<AutoMetadata | null>;
  cancel: () => void;
  reset: () => void;
  data: AutoMetadata | null;
  loading: boolean;
  error: AutoMetadataErrorCode | null;
};

type ServerResponse =
  | { ok: true; metadata: AutoMetadata; model: string; latency_ms: number }
  | { ok: false; error: string; code?: string; details?: unknown };

export function useAutoShortMetadata(): UseAutoShortMetadataResult {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AutoMetadata | null>(null);
  const [error, setError] = useState<AutoMetadataErrorCode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setData(null);
    setError(null);
  }, []);

  const generate = useCallback(
    async (file: File, durationSeconds?: number): Promise<AutoMetadata | null> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const duration = durationSeconds ?? (await readVideoDuration(file));
        if (!duration) throw new Error('UNREADABLE_VIDEO');

        const frames = await captureKeyframes(file, { positions: POSITIONS });
        if (ac.signal.aborted) return null;
        if (frames.length === 0) throw new Error('UNREADABLE_VIDEO');

        const { data: sessionResult } = await supabase.auth.getSession();
        const token = sessionResult.session?.access_token;
        if (!token) throw new Error('NOT_AUTHENTICATED');

        const resp = await fetch(ENDPOINT, {
          method: 'POST',
          signal: ac.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            duration_seconds: duration,
            mime_type: file.type || 'video/mp4',
            frames: frames.slice(0, POSITIONS.length).map((data_url, i) => ({
              position_ratio: POSITIONS[i] ?? 0.5,
              data_url,
            })),
          }),
        });

        if (!resp.ok) {
          const body = (await resp.json().catch(() => ({}))) as Partial<ServerResponse>;
          const code = (body as any)?.code;
          if (resp.status === 504 || code === 'TIMEOUT') throw new Error('TIMEOUT');
          if (resp.status === 429 || code === 'RATE_LIMIT') throw new Error('RATE_LIMIT');
          throw new Error('LLM_ERROR');
        }

        const body = (await resp.json()) as ServerResponse;
        if (!body.ok) throw new Error('LLM_ERROR');

        if (ac.signal.aborted) return null;
        setData(body.metadata);
        return body.metadata;
      } catch (e: any) {
        if (e?.name === 'AbortError' || ac.signal.aborted) {
          return null;
        }
        const msg = typeof e?.message === 'string' ? e.message : '';
        const code: AutoMetadataErrorCode = (
          msg === 'UNREADABLE_VIDEO' ||
          msg === 'NOT_AUTHENTICATED' ||
          msg === 'TIMEOUT' ||
          msg === 'RATE_LIMIT' ||
          msg === 'LLM_ERROR'
            ? msg
            : /NetworkError|Failed to fetch/i.test(msg)
            ? 'NETWORK'
            : 'UNKNOWN'
        ) as AutoMetadataErrorCode;
        setError(code);
        return null;
      } finally {
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
        setLoading(false);
      }
    },
    [],
  );

  return { generate, cancel, reset, data, loading, error };
}

export function autoMetadataErrorCopy(code: AutoMetadataErrorCode | null): string {
  switch (code) {
    case 'UNREADABLE_VIDEO':
      return "Couldn't read the video — please fill the details manually.";
    case 'NOT_AUTHENTICATED':
      return 'Sign-in required for Smart Upload — filling manually.';
    case 'TIMEOUT':
      return 'Auto-fill took too long — please fill manually or retry.';
    case 'RATE_LIMIT':
      return 'Smart Upload is busy, please try again in a moment.';
    case 'NETWORK':
      return 'Smart Upload is offline — filling manually.';
    case 'LLM_ERROR':
    case 'UNKNOWN':
      return "Couldn't auto-generate — please fill the details manually.";
    default:
      return '';
  }
}
