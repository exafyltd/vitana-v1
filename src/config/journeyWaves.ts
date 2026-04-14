/**
 * Frontend wave definitions — static config mirroring wave-defaults.ts from vitana-platform.
 * Only the 6 enabled waves are included. Update when backend wave config changes.
 */

export interface JourneyWave {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  icon: string;
  timeline: { start_day: number; end_day: number };
}

export const JOURNEY_WAVES: JourneyWave[] = [
  { id: 'wave-1', name: 'Getting Started', nameKey: 'calendar.journey.waveNames.wave-1', description: 'Set up your profile, meet Maxina, explore the community', icon: 'rocket', timeline: { start_day: 0, end_day: 7 } },
  { id: 'wave-2', name: 'Daily Anchors', nameKey: 'calendar.journey.waveNames.wave-2', description: 'Build daily habits — diary, matches, meetups', icon: 'sun', timeline: { start_day: 1, end_day: 14 } },
  { id: 'wave-3', name: 'Deepening Connections', nameKey: 'calendar.journey.waveNames.wave-3', description: 'Deepen connections, set goals, invite friends', icon: 'heart', timeline: { start_day: 7, end_day: 30 } },
  { id: 'wave-4', name: 'Health Intelligence', nameKey: 'calendar.journey.waveNames.wave-4', description: 'Health tracking, biomarker trends, Vitana Index', icon: 'activity', timeline: { start_day: 14, end_day: 60 } },
  { id: 'wave-5', name: 'Insight Moments', nameKey: 'calendar.journey.waveNames.wave-5', description: 'Weekly reports, pattern reveals, milestones', icon: 'lightbulb', timeline: { start_day: 30, end_day: 60 } },
  { id: 'wave-6', name: 'Recommendations & Discovery', nameKey: 'calendar.journey.waveNames.wave-6', description: 'Products, services, professionals tailored to you', icon: 'compass', timeline: { start_day: 30, end_day: 90 } },
];

export const JOURNEY_TOTAL_DAYS = 90;

export interface JourneyStage {
  dayNumber: number;
  wave: JourneyWave;
  waveProgress: number;
  totalProgress: number;
}

export function getJourneyStage(registrationDate: Date): JourneyStage | null {
  const dayNumber = Math.floor((Date.now() - registrationDate.getTime()) / 86400000);
  if (dayNumber < 0 || dayNumber > JOURNEY_TOTAL_DAYS) return null;

  // Find the most advanced active wave (last match for overlapping timelines)
  let activeWave = JOURNEY_WAVES[0];
  for (const wave of JOURNEY_WAVES) {
    if (dayNumber >= wave.timeline.start_day && dayNumber <= wave.timeline.end_day) {
      activeWave = wave;
    }
  }

  const waveDuration = activeWave.timeline.end_day - activeWave.timeline.start_day;
  const dayInWave = Math.max(0, dayNumber - activeWave.timeline.start_day);
  const waveProgress = Math.min(100, Math.round((dayInWave / waveDuration) * 100));
  const totalProgress = Math.min(100, Math.round((dayNumber / JOURNEY_TOTAL_DAYS) * 100));

  return { dayNumber, wave: activeWave, waveProgress, totalProgress };
}
