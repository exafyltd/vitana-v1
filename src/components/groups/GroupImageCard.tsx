import { UnifiedGroupCard } from "@/types/community";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface GroupImageCardProps {
  group: UnifiedGroupCard;
  variant?: "full" | "compact";
  showMatchScore?: boolean;
  onClick?: (group: UnifiedGroupCard) => void;
}

export const GroupImageCard = ({
  group,
  variant = "full",
  showMatchScore = true,
  onClick,
}: GroupImageCardProps) => {
  const { translate } = useTranslation();
  const isCompact = variant === "compact";
  
  const handleClick = () => {
    onClick?.(group);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden cursor-pointer",
        "shadow-sm hover:shadow-md transition-all duration-300",
        "hover:scale-[1.05] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]",
        isCompact ? "aspect-square" : "aspect-video"
      )}
    >
      {/* Background Image */}
      <img
        src={group.image}
        alt={group.name}
        className={cn(
          "w-full h-full object-cover transition-transform duration-300",
          "group-hover:scale-110"
        )}
      />

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Match Score Badge */}
      {showMatchScore && group.match_score && (
        <div className="absolute top-3 right-3 z-20">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-lg">
            {group.match_score}% Match
          </span>
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        {/* Category Badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="px-2 py-0.5 text-[11px] bg-white/20 backdrop-blur-sm text-white rounded-full font-medium">
            {group.category}
          </span>
        </div>

        {/* Group Name */}
        <h3 className={cn(
          "font-semibold text-white mb-1 line-clamp-2",
          isCompact ? "text-sm leading-snug" : "text-[15px] leading-snug"
        )}>
          {group.name}
        </h3>

        {/* Description (full variant only) */}
        {!isCompact && group.description && (
          <p className="text-[13px] text-white/80 mb-2 line-clamp-1">
            {group.description}
          </p>
        )}

        {/* Member Count */}
        <div className="flex items-center gap-1 text-[12px] text-white/90">
          <Users className="w-3.5 h-3.5" />
          <span>{group.member_count.toLocaleString()} members</span>
        </div>
      </div>

      {/* Join Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={cn(
          "absolute z-20 bg-white/90 backdrop-blur-sm rounded-full",
          "text-slate-800 hover:bg-white font-medium transition-all duration-200",
          "hover:shadow-lg",
          isCompact 
            ? "top-2 right-2 px-2.5 py-1 text-[11px]"
            : "top-3 right-3 px-3 py-1.5 text-[12px]"
        )}
      >
        Join
      </button>
    </div>
  );
};
