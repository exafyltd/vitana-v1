export interface RingPhase {
  start: number; // day offset where the phase begins
  end: number; // day offset where the phase ends
  color: string;
}

// Soft pastel palette — each phase (milestone-to-milestone) gets the next hue.
const PASTEL_PALETTE = ["#a7f3d0", "#99f6e4", "#bae6fd", "#c7d2fe", "#ddd6fe", "#fbcfe8"];

/**
 * Build phase segments from milestone day-offsets — each milestone bounds a
 * phase. Returns [] when there aren't enough milestones to form ≥2 phases (the
 * ring then falls back to its single gradient).
 */
export function buildPhases(milestoneDays: number[], totalDays: number): RingPhase[] {
  if (totalDays <= 0) return [];
  const bounds = Array.from(
    new Set([0, ...milestoneDays.filter((d) => d > 0 && d < totalDays), totalDays]),
  ).sort((a, b) => a - b);
  if (bounds.length < 3) return []; // need at least one interior milestone for ≥2 phases
  const phases: RingPhase[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    phases.push({ start: bounds[i], end: bounds[i + 1], color: PASTEL_PALETTE[i % PASTEL_PALETTE.length] });
  }
  return phases;
}
