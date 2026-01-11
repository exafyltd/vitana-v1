import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileProfileHeaderProps {
  avatarUrl?: string | null;
  displayName: string;
  handle?: string;
  archetype?: string;
  bio?: string;
  vitanaIndex?: number;
  editMode?: boolean;
  onEdit?: () => void;
  className?: string;
}

export function MobileProfileHeader({
  avatarUrl,
  displayName,
  handle,
  archetype,
  bio,
  vitanaIndex = 742,
  editMode = false,
  onEdit,
  className
}: MobileProfileHeaderProps) {
  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div className={cn("relative px-4 pt-safe-top pb-4", className)}>
      {/* Edit button - top right */}
      {editMode && onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {/* Avatar + Vitana badge row */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-lg">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Vitana Index - compact orb */}
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <span className="text-sm font-bold text-primary">{vitanaIndex}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Vitana</span>
        </div>
      </div>

      {/* Name */}
      <h1 className="text-center text-lg font-semibold text-foreground">
        {displayName}
      </h1>

      {/* Handle + Archetype */}
      <p className="text-center text-sm text-muted-foreground mt-0.5">
        {handle && <span>@{handle}</span>}
        {handle && archetype && <span> · </span>}
        {archetype && <span>{archetype}</span>}
      </p>

      {/* Bio - 2 lines max with fade */}
      {bio && (
        <p className="text-center text-sm text-muted-foreground mt-2 line-clamp-2 px-4">
          {bio}
        </p>
      )}
    </div>
  );
}
