import { Button } from "@/components/ui/button";

interface AdminEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AdminEmptyState({ title, description, actionLabel, onAction }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
