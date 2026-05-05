import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Sparkles } from "lucide-react";
import { ContactSyncModal } from "./ContactSyncModal";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface ImportContactsButtonProps {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  triggerContext?: "settings" | "invite" | "discovery";
  onImportComplete?: (result: { totalImported: number; matchesFound: number }) => void;
  /** @deprecated Use ContactSyncModal directly for full flow */
  onImport?: (contacts: Array<{ contact_name: string; contact_phone?: string; contact_email?: string }>) => Promise<void>;
}

export default function ImportContactsButton({
  variant = "primary",
  size = "default",
  triggerContext = "settings",
  onImportComplete,
  onImport,
}: ImportContactsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleComplete = (result: { totalImported: number; matchesFound: number }) => {
    onImportComplete?.(result);
  };

  const buttonVariants = {
    primary: "bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90 shadow-md",
    ghost: "hover:bg-[hsl(var(--contact-sync-tint))] text-foreground",
    outline: "border-[hsl(var(--contact-sync-accent)/0.3)] hover:bg-[hsl(var(--contact-sync-tint))] hover:border-[hsl(var(--contact-sync-accent))]",
  };

  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <>
      <Button
        variant={variant === "primary" ? "default" : variant}
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          buttonVariants[variant],
          sizeClasses[size]
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />{t('screens.contacts.finding')}
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />{t('screens.contacts.findFriends')}
            {variant === "primary" && (
              <Sparkles className="w-3 h-3 ml-1 opacity-70" />
            )}
          </>
        )}
      </Button>

      <ContactSyncModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        triggerContext={triggerContext}
        onComplete={handleComplete}
      />
    </>
  );
}

export { ImportContactsButton };
