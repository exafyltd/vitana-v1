import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface ErrorMessageProps {
  title?: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'bubble';
  isLoading?: boolean;
  className?: string;
}

export default function ErrorMessage({ 
  title,
  titleKey = 'errors.somethingWentWrong',
  description,
  descriptionKey = 'errors.tryAgain',
  onRetry,
  variant = 'card',
  isLoading = false,
  className = ""
}: ErrorMessageProps) {
  const { translate } = useTranslation();
  
  const displayTitle = title || translate(titleKey, 'Something went wrong');
  const displayDescription = description || translate(descriptionKey, 'Please try again');

  const content = (
    <>
      <div className="flex items-center gap-2 text-destructive mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium text-sm">{displayTitle}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{displayDescription}</p>
      {onRetry && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRetry}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {translate('buttons.retry', 'Retry')}
        </Button>
      )}
    </>
  );

  if (variant === 'bubble') {
    return (
      <div className={`p-3 border border-destructive bg-destructive/5 rounded-2xl max-w-sm ${className}`}>
        {content}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`p-3 border border-destructive/50 bg-destructive/5 rounded-md ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <Card className={`p-4 border-destructive/50 bg-destructive/5 ${className}`}>
      {content}
    </Card>
  );
}
