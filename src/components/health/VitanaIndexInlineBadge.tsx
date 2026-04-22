import { useNavigate } from "react-router-dom";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";

interface Props {
  variant?: "pill" | "circle";
  onClick?: () => void;
  className?: string;
}

/**
 * Shared inline Vitana Index badge used across community/health pages.
 * Replaces the many hand-written "742" pill/circle snippets with a single
 * component that subscribes to `useVitanaIndex()` and navigates to the
 * Index Detail Screen on click.
 */
export function VitanaIndexInlineBadge({ variant = "pill", onClick, className }: Props) {
  const navigate = useNavigate();
  const { index, isLoading } = useVitanaIndex();
  const value = isLoading || !index ? "…" : index.total.toString();

  const handleClick = () => {
    if (onClick) onClick();
    else navigate("/health/vitana-index");
  };

  if (variant === "circle") {
    return (
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-300 cursor-pointer ${className ?? ""}`}
        onClick={handleClick}
        role="button"
        aria-label={`Vitana Index: ${value}. Tap for details.`}
      >
        <span className="text-xl font-bold text-green-600">{value}</span>
      </div>
    );
  }

  // pill
  return (
    <span
      className={`inline-flex items-center gap-1 cursor-pointer ${className ?? ""}`}
      onClick={handleClick}
      role="button"
      aria-label={`Vitana Index: ${value}. Tap for details.`}
    >
      <span className="text-xs opacity-60">🧬</span>
      <span className="text-sm font-medium text-primary">{value}</span>
    </span>
  );
}

export default VitanaIndexInlineBadge;
