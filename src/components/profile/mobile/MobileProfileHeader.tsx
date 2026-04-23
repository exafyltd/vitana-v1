import { MobileIdentityCard } from "./MobileIdentityCard";

interface MobileProfileHeaderProps {
  avatarUrl?: string | null;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  displayName: string;
  handle?: string;
  archetype?: string;
  bio?: string;
  vitanaIndex?: number;
  vitanaPercentile?: number;
  editMode?: boolean;
  onEdit?: () => void;
  onViewFullId?: () => void;
  className?: string;
}

export function MobileProfileHeader({
  avatarUrl,
  avatarOffsetX,
  avatarOffsetY,
  displayName,
  handle,
  archetype,
  vitanaIndex,
  vitanaPercentile = 15,
  editMode = false,
  onEdit,
  onViewFullId,
  className
}: MobileProfileHeaderProps) {
  return (
    <MobileIdentityCard
      avatarUrl={avatarUrl}
      avatarOffsetX={avatarOffsetX}
      avatarOffsetY={avatarOffsetY}
      displayName={displayName}
      handle={handle}
      archetype={archetype}
      vitanaIndex={vitanaIndex}
      vitanaPercentile={vitanaPercentile}
      editMode={editMode}
      onEdit={onEdit}
      onViewFullId={onViewFullId}
      className={className}
    />
  );
}
