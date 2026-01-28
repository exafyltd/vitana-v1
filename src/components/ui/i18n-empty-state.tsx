import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface I18nEmptyStateProps {
  titleKey: string;
  descriptionKey?: string;
  Icon?: LucideIcon;
  actionKey?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Type-safe empty state component that only accepts translation keys.
 * This enforces the "no raw strings" rule for empty states.
 * 
 * Usage:
 * <I18nEmptyState 
 *   Icon={Users}
 *   titleKey="empty.noGroups"
 *   descriptionKey="empty.noGroupsDesc"
 *   actionKey="buttons.createGroup"
 *   onAction={() => navigate('/groups/create')}
 * />
 */
export function I18nEmptyState({ 
  titleKey, 
  descriptionKey, 
  Icon, 
  actionKey, 
  onAction,
  className = ""
}: I18nEmptyStateProps) {
  const { translate } = useTranslation();
  
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />}
      <h3 className="text-lg font-semibold mb-2">{translate(titleKey)}</h3>
      {descriptionKey && (
        <p className="text-muted-foreground max-w-sm mx-auto">{translate(descriptionKey)}</p>
      )}
      {actionKey && onAction && (
        <Button onClick={onAction} className="mt-4">
          {translate(actionKey)}
        </Button>
      )}
    </div>
  );
}
