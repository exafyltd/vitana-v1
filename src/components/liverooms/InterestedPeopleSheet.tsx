/**
 * The people who tapped "Notify me" on a scheduled Live Room (VTID-04912).
 * Opened from the "X dabei / going" count on the Live Room card.
 */
import { Loader2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { useStreamSubscribers } from '@/hooks/useStreamSubscribers';
import { t } from '@/lib/i18n-toast';

interface InterestedPeopleSheetProps {
  streamId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterestedPeopleSheet({ streamId, title, open, onOpenChange }: InterestedPeopleSheetProps) {
  const { data: people = [], isLoading } = useStreamSubscribers(streamId, open);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.liverooms.interestedTitle')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="line-clamp-2">{title}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-1 pb-4" data-testid="interested-people-list">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : people.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('screens.liverooms.interestedEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {people.map((p) => {
                const name = p.display_name || t('screens.liverooms.anonymousHost');
                return (
                  <li key={p.user_id} className="flex items-center gap-3 py-2.5" data-testid="interested-person">
                    <ClickableAvatar
                      userId={p.user_id}
                      src={p.avatar_url ?? undefined}
                      fallback={name[0] ?? '?'}
                      alt={name}
                      className="h-10 w-10"
                      loading="lazy"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
