import { useEffect, useState } from "react";
import { formatDistanceToNow, startOfDay, parseISO, isToday, isYesterday, isThisWeek, format } from "date-fns";
import { Mic, Image as ImageIcon, Type, Tag, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PhotoEntryCard } from "./PhotoEntryCard";
import { PhotoCarouselModal } from "./PhotoCarouselModal";
import { DateGroupHeader } from "./DateGroupHeader";
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface DiaryEntryListProps {
  entryType?: "voice" | "photo" | "text";
}

interface SelectedEntry {
  images: string[];
  caption: string;
  tags: string[];
  createdAt: string;
  initialIndex: number;
}

export function DiaryEntryList({ entryType }: DiaryEntryListProps) {
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [displayCount, setDisplayCount] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['diary-entries', entryType ?? 'all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (entryType) {
        query = query.eq('source', entryType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const visibleEntries = entries?.slice(0, displayCount);
  const hasMore = entries && entries.length > displayCount;

  // Set up real-time subscription
  useEffect(() => {
    const filterStr = entryType ? `source=eq.${entryType}` : undefined;
    const channel = supabase
      .channel(`diary-entries-changes-${entryType ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diary_entries',
          ...(filterStr ? { filter: filterStr } : {}),
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entryType, refetch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Also delete storage files if entry has attachments
      const entry = entries?.find(e => e.id === deleteTarget);
      if (entry?.attachments && Array.isArray(entry.attachments)) {
        const filePaths = (entry.attachments as string[])
          .map(url => {
            const match = url.match(/diary-photos\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];
        if (filePaths.length > 0) {
          await supabase.storage.from('diary-photos').remove(filePaths);
        }
      }

      const { error } = await supabase.from('diary_entries').delete().eq('id', deleteTarget);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['diary-entries'], exact: false });
      notify('toasts.diary.entryDeleted', 'toasts.diary.diaryEntryHasRemoved');
    } catch (error) {
      notifyError('toasts.diary.error', 'toasts.diary.failedDeleteEntryPleaseTryAgain');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getIconForSource = (source?: string) => {
    switch (source) {
      case "voice":
        return <Mic className="w-5 h-5 text-primary" />;
      case "photo":
        return <ImageIcon className="w-5 h-5 text-primary" />;
      case "text":
        return <Type className="w-5 h-5 text-primary" />;
      default:
        return <Mic className="w-5 h-5 text-primary" />;
    }
  };

  const getIconBgForSource = (source?: string) => {
    switch (source) {
      case "voice":
        return "bg-primary/10";
      case "photo":
        return "bg-primary/10";
      case "text":
        return "bg-primary/10";
      default:
        return "bg-primary/10";
    }
  };

  const getBadgeLabelForSource = (source?: string) => {
    switch (source) {
      case "voice":
        return "Voice Recording";
      case "photo":
        return "Photo";
      case "text":
        return "Text Entry";
      default:
        return "Entry";
    }
  };

  // Group visible entries by date
  const groupedEntries = visibleEntries?.reduce((groups, entry) => {
    const date = startOfDay(parseISO(entry.created_at));
    const dateKey = date.toISOString();
    if (!groups[dateKey]) {
      groups[dateKey] = { date, entries: [] };
    }
    groups[dateKey].entries.push(entry);
    return groups;
  }, {} as Record<string, { date: Date; entries: typeof entries }>);

  const sortedGroups = groupedEntries
    ? Object.values(groupedEntries).sort((a, b) => b.date.getTime() - a.date.getTime())
    : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!visibleEntries || visibleEntries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <div className={`w-12 h-12 rounded-full ${getIconBgForSource(entryType)} flex items-center justify-center mx-auto mb-2`}>
            {getIconForSource(entryType)}
          </div>
          <p>{t('screens.diary.noValue0EntriesYet', { value0: entryType || '' })}</p>
          <p className="text-sm mt-1">{t('screens.diary.startRecordingYourWellnessJourney')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {sortedGroups.map(({ date, entries: groupEntries }) => (
          <div key={date.toISOString()}>
            <DateGroupHeader date={date} />
            <div className="space-y-3">
              {groupEntries.map((entry) => {
                // Use PhotoEntryCard for photo entries
                if (entry.source === "photo" && entry.attachments && Array.isArray(entry.attachments) && entry.attachments.length > 0) {
                  return (
                    <PhotoEntryCard
                      key={entry.id}
                      id={entry.id}
                      text={entry.text}
                      attachments={entry.attachments as string[]}
                      tags={entry.tags || []}
                      createdAt={entry.created_at}
                      onThumbnailClick={() => {
                        setSelectedEntry({
                          images: entry.attachments as string[],
                          caption: entry.text,
                          tags: entry.tags || [],
                          createdAt: entry.created_at,
                          initialIndex: 0,
                        });
                      }}
                      onDelete={(id) => setDeleteTarget(id)}
                    />
                  );
                }

                // Regular card for voice and text entries
                return (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full ${getIconBgForSource(entry.source)} flex items-center justify-center`}>
                            {getIconForSource(entry.source)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {getBadgeLabelForSource(entry.source)}
                            </Badge>
                            {entry.duration && (
                              <Badge variant="outline">{Math.round(entry.duration)}s</Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                            <button
                              onClick={() => setDeleteTarget(entry.id)}
                              className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label={t('screens.diary.deleteEntry')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-sm text-foreground leading-relaxed mb-3">
                            {entry.text}
                          </p>

                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {entry.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="px-6 py-2 text-sm font-medium text-primary hover:text-primary/80 bg-muted/60 hover:bg-muted rounded-full transition-colors"
          >{t('screens.diary.loadMoreValue0Remaining', { value0: entries!.length - displayCount })}
          </button>
        </div>
      )}

      <PhotoCarouselModal
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        images={selectedEntry?.images || []}
        caption={selectedEntry?.caption}
        tags={selectedEntry?.tags}
        createdAt={selectedEntry?.createdAt}
        initialIndex={selectedEntry?.initialIndex || 0}
      />

      <ResponsiveConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ResponsiveConfirmDialogContent className="max-w-sm">
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.diary.deleteEntry')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {t('screens.diary.thisDiaryEntryWillPermanentlyDeleted')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel disabled={isDeleting}>{t('screens.diary.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </>
  );
}
