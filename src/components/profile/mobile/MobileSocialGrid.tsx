import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  url?: string;
}

interface MobileSocialGridProps {
  platforms?: SocialPlatform[];
  onConnect?: (platformId: string) => void;
  onManage?: () => void;
  className?: string;
}

// Default platforms with simple icons
const DEFAULT_PLATFORMS: SocialPlatform[] = [
  { id: "linkedin", name: "LinkedIn", icon: <span className="text-sm">{t('screens.profile.text')}</span>, connected: false },
  { id: "instagram", name: "Instagram", icon: <span className="text-sm">📸</span>, connected: false },
  { id: "tiktok", name: "TikTok", icon: <span className="text-sm">🎵</span>, connected: false },
  { id: "youtube", name: "YouTube", icon: <span className="text-sm">▶️</span>, connected: false },
  { id: "facebook", name: "Facebook", icon: <span className="text-sm">f</span>, connected: false },
  { id: "twitter", name: "X", icon: <span className="text-sm">𝕏</span>, connected: false },
];

export function MobileSocialGrid({
  platforms = DEFAULT_PLATFORMS,
  onConnect,
  onManage,
  className
}: MobileSocialGridProps) {
  return (
    <div className={cn("px-4 py-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t('screens.profile.socialPresence')}</h3>
        {onManage && (
          <button
            onClick={onManage}
            className="text-xs text-primary hover:underline"
          >
            Manage
          </button>
        )}
      </div>

      {/* Grid of platforms */}
      <div className="grid grid-cols-6 gap-2">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => onConnect?.(platform.id)}
            className={cn(
              "flex flex-col items-center justify-center",
              "h-14 rounded-xl border transition-all",
              platform.connected
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/30 border-border hover:border-primary/30"
            )}
          >
            {/* Platform icon */}
            <div className="text-base mb-0.5">
              {platform.icon}
            </div>
            
            {/* Status indicator */}
            {platform.connected ? (
              <Check className="h-3 w-3 text-primary" />
            ) : (
              <Plus className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
