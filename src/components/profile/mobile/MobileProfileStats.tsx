import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface MobileProfileStatsProps {
  postsCount?: number;
  mediaCount?: number;
  groupsCount?: number;
  className?: string;
}

export function MobileProfileStats({
  postsCount = 0,
  mediaCount = 0,
  groupsCount = 0,
  className
}: MobileProfileStatsProps) {
  const { translate } = useTranslation();
  
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className={cn("flex items-center justify-center py-2", className)}>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatCount(postsCount)}</span>
        <span> {translate('profileStats.posts', 'Posts')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(mediaCount)}</span>
        <span> {translate('profileStats.media', 'Media')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(groupsCount)}</span>
        <span> {translate('profileStats.groups', 'Groups')}</span>
      </p>
    </div>
  );
}
