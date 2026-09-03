/** Faint decorative wave accent, reused along the foot of event-game cards
 * and gradient panels — purely cosmetic, no semantics. */
export function DecorativeWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 Q 50 10 100 25 T 200 20 V40 H0 Z" fill="currentColor" />
    </svg>
  );
}
