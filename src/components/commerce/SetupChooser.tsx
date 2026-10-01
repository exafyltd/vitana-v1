/**
 * VTID-04795 — "Add your products or services": the four ways in, one place.
 *
 * An information-architecture change only; each option opens what already
 * exists:
 *   AI-assisted setup        → the AI agent card (MCP). Marked "In
 *                              development" and never "Recommended" until an
 *                              assistant can really create a business end to
 *                              end (the MCP server is not public yet and has
 *                              read-only tools — see the VTID-04795 PR).
 *   Connect my existing shop → the connect dialog (store URL → platform check)
 *   Add products myself      → AddProductSheet (Product / Service / Experience)
 *   Connect via API          → the connect dialog, for technical teams
 */
import { Bot, Code2, PackagePlus, Store } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n-toast';

export type SetupOption = 'ai' | 'shop' | 'manual' | 'api';

export const SETUP_OPTIONS: ReadonlyArray<{
  id: SetupOption;
  title: string;
  hint: string;
  Icon: typeof Bot;
  inDevelopment?: boolean;
}> = [
  { id: 'ai', title: 'screens.commerceportal.setupChooser.aiTitle', hint: 'screens.commerceportal.setupChooser.aiHint', Icon: Bot, inDevelopment: true },
  { id: 'shop', title: 'screens.commerceportal.setupChooser.shopTitle', hint: 'screens.commerceportal.setupChooser.shopHint', Icon: Store },
  { id: 'manual', title: 'screens.commerceportal.setupChooser.manualTitle', hint: 'screens.commerceportal.setupChooser.manualHint', Icon: PackagePlus },
  { id: 'api', title: 'screens.commerceportal.setupChooser.apiTitle', hint: 'screens.commerceportal.setupChooser.apiHint', Icon: Code2 },
];

export function SetupChooser({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (option: SetupOption) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile>
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="text-2xl font-bold">
            {t('screens.commerceportal.setupChooser.title')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-2 md:mt-4">
          {SETUP_OPTIONS.map(({ id, title, hint, Icon, inDevelopment }) => (
            <button
              key={id}
              type="button"
              data-testid={`setup-option-${id}`}
              onClick={() => {
                onOpenChange(false);
                onChoose(id);
              }}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-amber-500/60 hover:bg-amber-50/60"
            >
              <Icon className="h-6 w-6 shrink-0 text-amber-700" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  {t(title)}
                  {inDevelopment && (
                    <Badge variant="outline" className="border-amber-300 text-xs font-medium text-amber-800">
                      {t('screens.commerceportal.setupChooser.inDevelopment')}
                    </Badge>
                  )}
                </span>
                <span className="block text-sm text-muted-foreground">{t(hint)}</span>
              </span>
            </button>
          ))}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
