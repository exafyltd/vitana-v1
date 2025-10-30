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
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800 flex-1">{message}</p>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0 hover:bg-yellow-100"
          >
            <X className="h-4 w-4 text-yellow-600" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
