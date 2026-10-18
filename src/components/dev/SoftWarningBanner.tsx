import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SoftWarningBannerProps {
  message: string;
  dismissible?: boolean;
  children?: React.ReactNode;
}

export function SoftWarningBanner({ message, dismissible = true, children }: SoftWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-status-warning-subtle border border-status-warning/25 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
        <p className="text-sm text-status-warning flex-1">{message}</p>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0 hover:bg-status-warning-subtle"
          >
            <X className="h-4 w-4 text-status-warning" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
