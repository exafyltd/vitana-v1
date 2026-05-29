import { t } from "@/lib/i18n-toast";
import type { LucideIcon } from "lucide-react";
import { Wind, Moon, Sparkles } from "lucide-react";

// Production asset slots — drop curated painted illustrations here:
//   public/illustrations/future-self-stronger.webp
//   public/illustrations/future-self-calmer.webp
// CSS gradient backgrounds underneath so the tiles stay beautiful
// until the artwork lands.
interface Tile {
  id: string;
  bg: string;
  fallback: string;
  labelKey: string;
  icon: LucideIcon;
}

const TILES: Tile[] = [
  {
    id: "stronger",
    bg: "/illustrations/future-self-stronger.webp",
    fallback:
      "linear-gradient(135deg, #fed7aa 0%, #f9a8d4 45%, #c4b5fd 100%)",
    labelKey: "screens.autopilotdashboard.futureSelfStronger",
    icon: Wind,
  },
  {
    id: "calmer",
    bg: "/illustrations/future-self-calmer.webp",
    fallback:
      "linear-gradient(135deg, #c4b5fd 0%, #93c5fd 45%, #67e8f9 100%)",
    labelKey: "screens.autopilotdashboard.futureSelfCalmer",
    icon: Moon,
  },
];

const SERIF: React.CSSProperties = { fontFamily: "Cormorant, Georgia, serif" };

/**
 * Two aspirational "future self" tiles that sit below the dream-board hero.
 * Each tile is a painted thumbnail of an identity the user is moving toward
 * — same painted-illustration treatment as the main hero, just smaller.
 *
 * v1: a fixed pair. v2 (after the dream-board ships): goal-aware, picking
 * tiles by the user's life_compass.pillar_focus and life_compass.category.
 */
export function FutureSelfTiles() {
  return (
    <div>
      <div className="flex items-baseline justify-between mx-4 mb-2 mt-5">
        <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground">
          {t("screens.autopilotdashboard.futureSelfTitle")}
        </h2>
        <span className="text-xs text-violet-500 font-semibold inline-flex items-center gap-0.5">
          <Sparkles className="w-3 h-3" />
          {t("screens.autopilotdashboard.futureSelfHint")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mx-4">
        {TILES.map((tile) => (
          <div
            key={tile.id}
            className="relative aspect-[1/1.1] rounded-[20px] overflow-hidden border border-border/60 shadow-md"
            style={{
              backgroundImage: `url(${tile.bg}), ${tile.fallback}`,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5) 100%)",
              }}
            />
            <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center text-violet-700 backdrop-blur-sm">
              <tile.icon className="w-3.5 h-3.5" />
            </div>
            <div
              className="absolute left-3 right-3 bottom-2.5 text-white font-semibold leading-tight"
              style={{
                ...SERIF,
                fontSize: 15,
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {t(tile.labelKey)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FutureSelfTiles;
