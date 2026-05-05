import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface ErrorNotification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

interface ErrorNotificationProps {
  id: string;
  title: string;
  description: string;
  onDismiss: (id: string) => void;
}

const ErrorNotification = ({ id, title, description, onDismiss }: ErrorNotificationProps) => (
  <div className="relative bg-destructive/10 border-2 border-destructive rounded-lg p-4 pr-10 mb-3 shadow-lg animate-in fade-in slide-in-from-top-2 pointer-events-auto">
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss(id);
      }}
      className="absolute top-2 right-2 h-8 w-8 hover:bg-destructive/20"
      aria-label={t('screens.common.closeErrorNotification')}
    >
      <X className="h-4 w-4 text-destructive" />
    </Button>
    
    <div className="select-text">
      <h4 className="font-semibold text-destructive mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const ErrorNotificationStack = ({ 
  errors, 
  onDismiss 
}: { 
  errors: ErrorNotification[]; 
  onDismiss: (id: string) => void;
}) => {
  if (errors.length === 0) return null;
  
  return (
    <div className="fixed top-20 right-4 z-[110] max-w-md space-y-3">
      {errors.map(error => (
        <ErrorNotification
          key={error.id}
          {...error}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
