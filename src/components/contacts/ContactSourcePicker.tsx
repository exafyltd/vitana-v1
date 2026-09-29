import { useState } from "react";
import { Check, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';
import { contactPickerSupported } from "@/lib/connected-apps-client";

export type ContactSource = "google" | "outlook" | "icloud" | "phonebook" | "whatsapp";

interface SourceConfig {
  id: ContactSource;
  nameKey: string;
  icon: React.ReactNode;
  colorVar: string;
  available: boolean;
}

interface ContactSourcePickerProps {
  selectedSources: ContactSource[];
  onSourceToggle: (source: ContactSource) => void;
  disabledSources?: ContactSource[];
  connectedSources?: ContactSource[];
  contactCounts?: Partial<Record<ContactSource, number>>;
}

const sources: SourceConfig[] = [
  {
    id: "google",
    nameKey: "mailhub.apps.google-contacts.name",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    colorVar: "--contact-source-google",
    available: true,
  },
  {
    // VTID-04449: Outlook / Microsoft 365 address book, through the hub.
    id: "outlook",
    nameKey: "mailhub.apps.outlook-contacts.name",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="4" width="12" height="16" rx="2" fill="#0078D4"/>
        <circle cx="8" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8"/>
        <path fill="#28A8EA" d="M15 7h6.5a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H15z"/>
      </svg>
    ),
    colorVar: "--contact-source-outlook",
    available: true,
  },
  {
    id: "icloud",
    nameKey: "mailhub.apps.iphone-contacts.name",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.004 4c2.904 0 5.432 1.664 6.684 4.076a5.5 5.5 0 0 1 .812 10.899L20.5 19h-13l-.003-.001a6.5 6.5 0 0 1-1.205-12.872A7.003 7.003 0 0 1 13.004 4z"/>
      </svg>
    ),
    colorVar: "--contact-source-apple",
    // iCloud goes through the Connected Apps hub, so it works on any device.
    available: true,
  },
  {
    id: "phonebook",
    nameKey: "mailhub.apps.android-contacts.name",
    icon: <Smartphone className="w-5 h-5" />,
    colorVar: "--contact-source-phone",
    available: contactPickerSupported(),
  },
];

export function ContactSourcePicker({
  selectedSources,
  onSourceToggle,
  disabledSources = [],
  connectedSources = [],
  contactCounts = {},
}: ContactSourcePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {sources.map((source, index) => {
        const isSelected = selectedSources.includes(source.id);
        const isDisabled = disabledSources.includes(source.id) || !source.available;
        const isConnected = connectedSources.includes(source.id);
        const count = contactCounts[source.id];

        return (
          <motion.button
            key={source.id}
            data-testid={`find-friends-source-${source.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isDisabled && onSourceToggle(source.id)}
            disabled={isDisabled}
            className={cn(
              "contact-source-pill flex-col items-start p-4 h-auto relative",
              "transition-all duration-200",
              isSelected && "ring-2 ring-[hsl(var(--contact-sync-accent))] bg-[hsl(var(--contact-sync-tint))]",
              isDisabled && "opacity-50 cursor-not-allowed",
              !isDisabled && !isSelected && "hover:bg-muted"
            )}
          >
            {/* Connected badge */}
            {isConnected && (
              <div className="absolute top-2 end-2">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--contact-success)/0.1)] text-[hsl(var(--contact-success))]">
                  {t('screens.contacts.connected')}
                </span>
              </div>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 start-2 w-5 h-5 rounded-full bg-[hsl(var(--contact-sync-accent))] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Icon */}
            <div 
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                isSelected 
                  ? "bg-[hsl(var(--contact-sync-accent)/0.15)]"
                  : "bg-muted"
              )}
              style={{ 
                color: isSelected 
                  ? `hsl(var(${source.colorVar}))` 
                  : undefined 
              }}
            >
              {source.icon}
            </div>

            {/* Text */}
            <span className="block w-full text-sm font-medium text-foreground text-start">
              {t(source.nameKey)}
            </span>
            <span className="block w-full text-xs text-muted-foreground text-start">
              {source.id === "phonebook"
                ? t(source.available ? "mailhub.findFriends.status.phone" : "mailhub.findFriends.status.phoneUnavailable")
                : t(isConnected ? "mailhub.findFriends.status.on" : "mailhub.findFriends.status.off")}
            </span>

            {/* Contact count */}
            {count !== undefined && count > 0 && (
              <span className="block text-xs font-medium text-[hsl(var(--contact-sync-accent))] mt-1">{t('screens.contacts.countContacts', { count })}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default ContactSourcePicker;
