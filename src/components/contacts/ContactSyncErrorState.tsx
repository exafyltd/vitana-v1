import { AlertCircle, RefreshCw, Settings, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { t } from '@/lib/i18n-toast';

type ErrorType = "oauth_failed" | "api_unavailable" | "permission_denied" | "rate_limited" | "unknown";

interface ContactSyncErrorStateProps {
  errorType: ErrorType;
  message?: string;
  onRetry: () => void;
  onBack: () => void;
  retryAfter?: number; // seconds for rate limit
}

const errorConfig: Record<ErrorType, {
  icon: React.ReactNode;
  title: string;
  description: string;
  showSettings?: boolean;
}> = {
  oauth_failed: {
    icon: <ShieldX className="w-8 h-8 text-destructive" />,
    title: "Connection Failed",
    description: "We couldn't connect to your account. This might be due to expired permissions or a temporary issue.",
  },
  api_unavailable: {
    icon: <AlertCircle className="w-8 h-8 text-[hsl(var(--contact-warning))]" />,
    title: "Service Unavailable",
    description: "The contact import feature is not available on your device or browser. Try using our mobile app instead.",
  },
  permission_denied: {
    icon: <ShieldX className="w-8 h-8 text-destructive" />,
    title: "Permission Denied",
    description: "VITANA needs permission to access your contacts. Please enable contacts access in your device settings.",
    showSettings: true,
  },
  rate_limited: {
    icon: <AlertCircle className="w-8 h-8 text-[hsl(var(--contact-warning))]" />,
    title: "Too Many Requests",
    description: "Please wait a moment before trying again.",
  },
  unknown: {
    icon: <AlertCircle className="w-8 h-8 text-destructive" />,
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
  },
};

export function ContactSyncErrorState({
  errorType,
  message,
  onRetry,
  onBack,
  retryAfter,
}: ContactSyncErrorStateProps) {
  const config = errorConfig[errorType];

  const openSettings = () => {
    // On mobile, this might open device settings
    // For now, just show instructions
    if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
      window.open("app-settings:", "_self");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6 py-4"
    >
      {/* Error icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center"
      >
        {config.icon}
      </motion.div>

      {/* Title & Description */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {message || config.description}
        </p>
      </div>

      {/* Rate limit countdown */}
      {errorType === "rate_limited" && retryAfter && (
        <div className="text-sm font-medium text-muted-foreground">
          Retry in {retryAfter}s
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-2 pt-2">
        {config.showSettings && (
          <Button
            onClick={openSettings}
            className="w-full"
            variant="outline"
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('screens.contacts.openSettings')}
          </Button>
        )}

        <Button
          onClick={onRetry}
          disabled={errorType === "rate_limited" && !!retryAfter}
          className="w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('screens.contacts.tryAgain')}
        </Button>

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground"
        >
          {t('screens.contacts.goBack')}
        </Button>
      </div>
    </motion.div>
  );
}

export default ContactSyncErrorState;
