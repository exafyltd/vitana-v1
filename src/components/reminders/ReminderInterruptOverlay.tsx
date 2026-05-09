/**
 * VTID-02601 — Full-screen overlay shown when a reminder fires.
 *
 * Behavior on fire:
 * 1. Resume / unlock AudioContext (browsers suspend after inactivity).
 * 2. Decode + play the chime PCM (24kHz mono 16-bit) — pre-cached server-side.
 * 3. After chime ends, play the pre-rendered TTS voice (MP3).
 * 4. Show banner with action_text, spoken_message, and three actions.
 *
 * Audio note: browser autoplay policy requires a prior user gesture in the
 * tab to unlock the AudioContext. In practice the user will have tapped or
 * clicked something already (login, ORB, navigation). On totally idle tabs
 * playback may be blocked — the banner still appears, the audio doesn't.
 * The plan calls this a v1 trade-off; v2 wires a native Appilix bridge.
 */

import React, { useEffect, useRef, useState } from "react";
import { useReminderStream, ReminderFirePayload } from "@/hooks/useReminderStream";
import { ackReminder, completeReminder, snoozeReminder, deleteReminder } from "@/lib/reminders-api";
import { Button } from "@/components/ui/button";
import { Bell, Check, Clock, X } from "lucide-react";
import { t } from '@/lib/i18n-toast';

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decode the 24kHz mono 16-bit signed PCM bytes into an AudioBuffer. */
function decodePcm16(ctx: AudioContext, bytes: Uint8Array, sampleRate = 24000): AudioBuffer {
  const sampleCount = Math.floor(bytes.length / 2);
  const buf = ctx.createBuffer(1, sampleCount, sampleRate);
  const ch = buf.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < sampleCount; i++) {
    const s = view.getInt16(i * 2, true);
    ch[i] = s / 32768;
  }
  return buf;
}

async function playChime(ctx: AudioContext, b64: string): Promise<void> {
  const bytes = b64ToBytes(b64);
  const buf = decodePcm16(ctx, bytes);
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    src.start();
  });
}

async function playMp3(ctx: AudioContext, b64: string): Promise<void> {
  const bytes = b64ToBytes(b64);
  const buf = await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    src.start();
  });
}

export const ReminderInterruptOverlay: React.FC = () => {
  const { latestFire, clear } = useReminderStream();
  const [active, setActive] = useState<ReminderFirePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const playedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!latestFire) return;
    setActive(latestFire);
    if (playedFor.current === latestFire.reminder_id) return;
    playedFor.current = latestFire.reminder_id;

    (async () => {
      const ctx = getCtx();
      if (!ctx) {
        console.warn("[reminder-overlay] AudioContext unavailable");
        return;
      }
      try {
        if (ctx.state === "suspended") await ctx.resume();
        await playChime(ctx, latestFire.chime_pcm_b64);
        if (latestFire.voice_audio_b64) {
          await playMp3(ctx, latestFire.voice_audio_b64);
        }
      } catch (err) {
        console.warn("[reminder-overlay] audio playback failed (autoplay?)", err);
      }
    })();

    // Mark delivered server-side via SSE
    ackReminder(latestFire.reminder_id, "sse").catch(() => {});

    // Auto-dismiss after 60s
    const t = window.setTimeout(() => {
      setActive(null);
      clear();
    }, 60_000);
    return () => window.clearTimeout(t);
  }, [latestFire, clear]);

  if (!active) return null;

  const onComplete = async () => {
    setBusy(true);
    try {
      await completeReminder(active.reminder_id);
    } finally {
      setBusy(false);
      setActive(null);
      clear();
    }
  };

  const onSnooze = async () => {
    setBusy(true);
    try {
      await snoozeReminder(active.reminder_id, 10);
    } finally {
      setBusy(false);
      setActive(null);
      clear();
    }
  };

  const onDismiss = async () => {
    setBusy(true);
    try {
      await ackReminder(active.reminder_id, "manual");
    } finally {
      setBusy(false);
      setActive(null);
      clear();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('screens.reminders.reminder')}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border-2 border-primary">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Bell className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold">{active.action_text}</h2>
        </div>
        {active.spoken_message && active.spoken_message !== active.action_text ? (
          <p className="text-sm text-muted-foreground mb-4">{active.spoken_message}</p>
        ) : null}
        {active.description ? (
          <p className="text-sm text-muted-foreground mb-4">{active.description}</p>
        ) : null}
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onComplete} disabled={busy} size="lg" className="w-full">
            <Check className="h-4 w-4 mr-2" />
            {t('screens.reminders.markDone')}
          </Button>
          <Button onClick={onSnooze} disabled={busy} size="lg" variant="outline" className="w-full">
            <Clock className="h-4 w-4 mr-2" />
            {t('screens.reminders.snooze10Min')}
          </Button>
          <Button onClick={onDismiss} disabled={busy} size="lg" variant="ghost" className="w-full">
            <X className="h-4 w-4 mr-2" />
            {t('screens.reminders.dismiss')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReminderInterruptOverlay;
