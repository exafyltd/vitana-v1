import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import { VITANA_INDEX_OPEN_EVENT } from "./VitanaIndexSheet";
import { useVitanaStreaks } from "@/hooks/useVitanaStreaks";
import { t } from '@/lib/i18n-toast';

/**
 * Sidebar-styled twin of the mobile `VitanaIndexChip`. Lives in the desktop
 * Quick Actions row and opens the shared `VitanaIndexSheet` via the global
 * `vitana:open-index` event. Mobile chip and this chip are the only two
 * triggers users see; everything else flows through the same event.
 */
export function DesktopVitanaIndexChip() {
  const { index } = useVitanaIndexCache();
  const { current: streakDays } = useVitanaStreaks();
  const score = index?.total ?? null;
  const showStreak = streakDays >= 3;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative shrink-0 transition-all duration-200">
            <Button
              variant="ghost"
              className="hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg p-0 text-white"
              onClick={handleClick}
              aria-label={
                score !== null
                  ? `Open Vitana Index — currently ${score}${showStreak ? `, ${streakDays}-day streak` : ""}`
                  : "Open Vitana Index"
              }
            >
              <span className="text-base leading-none" aria-hidden="true">
                🧬
              </span>
            </Button>
            {score !== null && !showStreak && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none z-10"
                aria-hidden="true"
              >
                {score}
              </span>
            )}
            {showStreak && (
              <span
                className="absolute -top-1 -right-1 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none z-10"
                aria-hidden="true"
              >
                🔥{streakDays}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t('screens.health.vitanaIndexYourNorthStar')}
            {showStreak && (
              <span className="block text-xs text-muted-foreground">{t('screens.health.streakdaysdayStreak', { streakDays })}
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DesktopVitanaIndexChip;
