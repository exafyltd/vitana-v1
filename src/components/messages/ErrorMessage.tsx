import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'bubble';
  isLoading?: boolean;
  className?: string;
}

export default function ErrorMessage({ 
  title = "Something went wrong",
  description = "Please try again",
  onRetry,
  variant = 'card',
  isLoading = false,
  className = ""
}: ErrorMessageProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-destructive mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
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
          Retry
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