import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/ui/responsive-popover';
import { useSidebar } from '@/components/ui/sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALE_PRESENTATION } from './locale-presentation';
import { LanguageOptionsList } from './LanguageOptionsList';
import { t } from '@/lib/i18n-toast';

/**
 * Desktop sidebar language control — mirrors `SoundscapeControl`'s structure
 * (icon-only when the sidebar is collapsed, flag/name/chevron row when
 * expanded) so both sit consistently in `SidebarFooter`. Unlike Soundscape's
 * mute button, picking a language opens a list rather than toggling a single
 * state, so the whole row/icon is the popover trigger.
 */
export function LanguageSidebarControl() {
  const { selectedLanguage } = useLanguage();
  const { open } = useSidebar();
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = LOCALE_PRESENTATION[selectedLanguage] ?? LOCALE_PRESENTATION['de-DE'];

  // Collapsed sidebar — icon only
  if (!open) {
    return (
      <ResponsivePopover open={pickerOpen} onOpenChange={setPickerOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-accent/10 transition-all duration-200"
            aria-label={t('screens.settings.language')}
          >
            <img src={current.flag} alt="" className="h-4 w-6 rounded-sm object-cover" />
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title={t('screens.settings.language')} side="right" className="w-56 p-2">
          <LanguageOptionsList onSelected={() => setPickerOpen(false)} />
        </ResponsivePopoverContent>
      </ResponsivePopover>
    );
  }

  // Expanded sidebar — full row
  return (
    <div className="w-full px-2">
      <ResponsivePopover open={pickerOpen} onOpenChange={setPickerOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-lg bg-accent/10 hover:bg-accent/15 transition-colors p-2"
          >
            <img src={current.flag} alt="" className="h-4 w-6 rounded-sm object-cover shrink-0" />
            <span className="flex-1 text-sm text-foreground text-start">{current.endonym}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title={t('screens.settings.language')} side="right" className="w-56 p-2">
          <LanguageOptionsList onSelected={() => setPickerOpen(false)} />
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </div>
  );
}
