export interface RingPhase {
  start: number; // day offset where the phase begins
  end: number; // day offset where the phase ends
  color: string;
}

// Mid-saturation palette — readable against the warm-gradient hero card while
// still feeling soft (the upcoming portion is drawn at lower opacity).
const PASTEL_PALETTE = ["#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"];

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
