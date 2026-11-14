/**
 * VTID-05530 — the calendar's colour and emoji language: the native twin of the web's
 * `vcal/theme.ts`. One kind per entry (lab order, Vitana Index pillar, event type), each with a soft
 * card background, a readable ink colour, a strong accent for the full-screen header and a default
 * emoji. These are the calendar's own entry-kind palette, the same values as the web.
 */
import type { CalendarEntry } from './data/api';

export type EntryKind = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental' | 'community' | 'lab' | 'work' | 'vitana' | 'personal';

export interface KindStyle {
  bg: string;
  ink: string;
  accent: string;
  emoji: string;
}

export const KIND_STYLE: Record<EntryKind, KindStyle> = {
  nutrition: { bg: '#E3F7D9', ink: '#1F5E14', accent: '#2E7D1F', emoji: '🥗' },
  hydration: { bg: '#DDF1FF', ink: '#0B4F7A', accent: '#1172B8', emoji: '💧' },
  exercise: { bg: '#FFE6D1', ink: '#8A3A00', accent: '#C4520A', emoji: '🏃' },
  sleep: { bg: '#E4E3FF', ink: '#34307F', accent: '#4B45C4', emoji: '😴' },
  mental: { bg: '#F0E4FF', ink: '#5A2A8A', accent: '#7B3FC4', emoji: '🧘' },
  community: { bg: '#FFE0EA', ink: '#8A1440', accent: '#C22F66', emoji: '🎉' },
  lab: { bg: '#D9F5F0', ink: '#0D5C52', accent: '#11806F', emoji: '🧪' },
  work: { bg: '#E6EEF5', ink: '#24435E', accent: '#35607F', emoji: '💼' },
  vitana: { bg: '#ECEBFF', ink: '#3B36A8', accent: '#5B54D6', emoji: '✨' },
  personal: { bg: '#FFF1D6', ink: '#6B4300', accent: '#8F5B00', emoji: '📌' },
};

/** Surface colours shared by every view (the Index page's slate and teal). */
export const SURFACE = {
  page: '#F8FAFC',
  card: '#FFFFFF',
  track: '#F1F5F9',
  ink: '#0F172A',
  muted: '#475569',
  faint: '#94A3B8',
  busyBg: '#F1F5F9',
  busyInk: '#64748B',
  line: '#E2E8F0',
  link: '#0F766E',
  /** "Today" in Week and Month. */
  today: '#6D28D9',
} as const;

const PILLARS = new Set(['nutrition', 'hydration', 'exercise', 'sleep', 'mental']);
const WORK_TYPES = new Set(['professional', 'admin_task', 'dev_task', 'deployment', 'sprint_milestone']);

export function entryKind(e: Pick<CalendarEntry, 'event_type' | 'pillar' | 'wellness_tags' | 'source_type' | 'source_ref_type'>): EntryKind {
  if (e.source_ref_type === 'lab_order' || e.source_type === 'lab_order') return 'lab';
  if (e.pillar && PILLARS.has(e.pillar)) return e.pillar as EntryKind;
  const tag = (e.wellness_tags ?? []).find((x) => x.startsWith('pillar:'));
  if (tag && PILLARS.has(tag.slice(7))) return tag.slice(7) as EntryKind;
  switch (e.event_type) {
    case 'workout':
      return 'exercise';
    case 'nutrition':
      return 'nutrition';
    case 'community':
      return 'community';
    case 'health':
      return 'lab';
    case 'autopilot':
    case 'journey_milestone':
    case 'wellness_nudge':
      return 'vitana';
    default:
      return WORK_TYPES.has(e.event_type) ? 'work' : 'personal';
  }
}

export function isDone(e: Pick<CalendarEntry, 'completion_status' | 'completed_at'>): boolean {
  return e.completion_status === 'completed' || !!e.completed_at;
}
