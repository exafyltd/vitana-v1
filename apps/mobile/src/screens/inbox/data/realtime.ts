/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — realtime
 * channels of the inbox data layer over the native Supabase client (the web
 * routes every channel through `src/integrations/supabase/realtime.ts`, which
 * delegates to `supabase.channel` while `VITE_REALTIME_URL` is unset; the
 * native client has no separate realtime host). Each subscription gets a
 * unique topic so two mounted hooks never share one channel.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Binding =
  | { kind: 'postgres'; event: 'INSERT' | 'UPDATE' | '*'; table: string; filter?: string; handler: (payload: any) => void }
  | { kind: 'broadcast'; event: string; handler: (payload: any) => void };

let seq = 0;

/** Subscribes the bindings on one channel; returns the unsubscribe. A client without realtime is a no-op. */
export function subscribeChannel(sb: SupabaseClient, name: string, bindings: Binding[], onStatus?: (status: string) => void, unique = true): () => void {
  if (typeof (sb as any)?.channel !== 'function') return () => undefined;
  seq += 1;
  let ch: RealtimeChannel = sb.channel(unique ? `${name}_${seq}` : name);
  for (const b of bindings) {
    ch =
      b.kind === 'postgres'
        ? (ch as any).on('postgres_changes', { event: b.event, schema: 'public', table: b.table, ...(b.filter ? { filter: b.filter } : {}) }, b.handler)
        : (ch as any).on('broadcast', { event: b.event }, b.handler);
  }
  ch.subscribe((status: string) => onStatus?.(status));
  return () => {
    void sb.removeChannel(ch);
  };
}

/** A broadcast on a shared topic (web `realtimeChannel('unread_sync').send(...)`). */
export async function broadcast(sb: SupabaseClient, name: string, event: string, payload: Record<string, unknown>): Promise<void> {
  if (typeof (sb as any)?.channel !== 'function') return;
  const ch = sb.channel(name);
  try {
    await ch.send({ type: 'broadcast', event, payload });
  } finally {
    void sb.removeChannel(ch);
  }
}
