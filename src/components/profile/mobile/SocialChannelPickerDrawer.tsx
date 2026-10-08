/**
 * VTID-04979 — channel picker opened by the "+" on the Social tab.
 * Lists every social channel; picking one hands the platform back to
 * MobileIdCardBack, which opens the same edit dialog a tap on a logo opens
 * (after this drawer has fully closed, so two modals never stack).
 */
import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useTranslation } from "@/hooks/useTranslation";

export interface SocialChannelOption {
  id: string;
  name: string;
  icon: ReactNode;
  tileBg: string;
  connected: boolean;
}

interface SocialChannelPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires once the close animation has finished (vaul onAnimationEnd). */
  onClosed?: () => void;
  channels: SocialChannelOption[];
  onPick: (id: string) => void;
}

export function SocialChannelPickerDrawer({
  open,
  onOpenChange,
  onClosed,
  channels,
  onPick,
}: SocialChannelPickerDrawerProps) {
  const { translate } = useTranslation();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(isOpen) => {
        if (!isOpen) onClosed?.();
      }}
    >
      <DrawerContent data-testid="social-channel-picker">
        <DrawerHeader className="text-start">
          <DrawerTitle>{translate('socialImport.pickerTitle', 'Choose a channel')}</DrawerTitle>
          <DrawerDescription>
            {translate('socialImport.pickerDescription', 'Pick the social channel you want to connect or edit.')}
          </DrawerDescription>
        </DrawerHeader>
        <ul className="px-4 pb-6 space-y-2">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                data-testid={`social-channel-option-${channel.id}`}
                onClick={() => onPick(channel.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-3 text-start shadow-sm transition-colors active:bg-slate-50"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={{ backgroundColor: channel.tileBg }}
                >
                  {channel.icon}
                </span>
                <span className="flex-1 text-sm font-semibold text-slate-900">{channel.name}</span>
                {channel.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    {translate('socialImport.connected', 'Connected')}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400 rtl:rotate-180" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
