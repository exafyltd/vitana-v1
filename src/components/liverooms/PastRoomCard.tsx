/**
 * Past Live Room card.
 *
 * Renders an *ended* room in the "Past" tab: cover, host, when it ended, a
 * short session recap (peak listeners / messages / planned length), recording
 * playback when one is ready, and a host-only delete action. Deliberately
 * separate from LiveRoomCard, which is built around the live/scheduled states
 * (LIVE badge, Join, Notify) that don't apply to a finished room.
 */

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from '@/components/ui/responsive-confirm-dialog';
import { Play, Users, MessageSquare, Clock, Trash2, CalendarDays } from 'lucide-react';
import { StreamRecordingPlayer } from '@/components/StreamRecordingPlayer';
import { fmtDate, fmtTime, fmtDateTime, formatDistanceToNow } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import type { EndedStream } from '@/hooks/useLiveStreams';

interface PastRoomCardProps {
  stream: EndedStream;
  hostName: string;
  hostAvatar?: string;
  isHost: boolean;
  onDelete: (streamId: string) => void;
}

export function PastRoomCard({ stream, hostName, hostAvatar, isHost, onDelete }: PastRoomCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const endedAt = stream.ended_at ? new Date(stream.ended_at) : null;
  const recording = stream.recording;

  // Absolute "when it was held": the actual start (started_at, else the
  // scheduled time), with the end time appended when known. Rendered as e.g.
  // "Sa., 28. Juni · 17:00–17:45" so a finished session shows concretely when
  // it ran — not just a relative "ended 2 days ago".
  const heldStartRaw = stream.started_at ?? stream.scheduled_for;
  const heldStart = heldStartRaw ? new Date(heldStartRaw) : null;
  const heldLabel = heldStart
    ? (endedAt
        ? t('screens.liverooms.past.heldRange', {
            date: fmtDate(heldStart, { weekday: 'short', day: 'numeric', month: 'long' }),
            start: fmtTime(heldStart, { hour: '2-digit', minute: '2-digit' }),
            end: fmtTime(endedAt, { hour: '2-digit', minute: '2-digit' }),
          })
        : t('screens.liverooms.past.heldAt', {
            date: fmtDate(heldStart, { weekday: 'short', day: 'numeric', month: 'long' }),
            time: fmtTime(heldStart, { hour: '2-digit', minute: '2-digit' }),
          }))
    : null;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
      {/* Cover */}
      <div className="relative aspect-video bg-muted">
        {stream.cover_image_url ? (
          <img
            src={stream.cover_image_url}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10" />
        )}
        <Badge className="absolute top-3 left-3 bg-foreground/80 text-background border-0">
          {t('screens.liverooms.past.endedBadge')}
        </Badge>
        {recording && (
          <button
            type="button"
            onClick={() => setPlayerOpen(true)}
            aria-label={t('screens.liverooms.past.watchRecording')}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90">
              <Play className="w-6 h-6 text-black ml-0.5" />
            </span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold leading-tight line-clamp-2">{stream.title}</h3>
          {heldLabel && (
            <p className="flex items-center gap-1.5 text-xs text-foreground/80 mt-1.5">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              {heldLabel}
            </p>
          )}
          {endedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('screens.liverooms.past.endedValue', {
                value0: formatDistanceToNow(endedAt, { addSuffix: true }),
              })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={hostAvatar} alt={hostName} />
            <AvatarFallback>{hostName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate">{hostName}</span>
        </div>

        {/* Recap */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {t('screens.liverooms.past.peakListeners', { value0: stream.peak_viewers ?? 0 })}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {t('screens.liverooms.past.messages', { value0: stream.total_messages ?? 0 })}
          </span>
          {stream.duration_minutes ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t('screens.liverooms.past.plannedMinutes', { value0: stream.duration_minutes })}
            </span>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {recording ? (
            <Button size="sm" className="flex-1" onClick={() => setPlayerOpen(true)}>
              <Play className="w-4 h-4 mr-2" />
              {t('screens.liverooms.past.watchRecording')}
            </Button>
          ) : (
            <p className="flex-1 text-xs text-muted-foreground">
              {t('screens.liverooms.past.noRecording')}
            </p>
          )}
          {isHost && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              aria-label={t('screens.liverooms.past.delete')}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Recording player */}
      {recording && (
        <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{stream.title}</DialogTitle>
            </DialogHeader>
            <StreamRecordingPlayer
              recording={{
                id: recording.id,
                recording_url: recording.recording_url,
                duration_seconds: recording.duration_seconds,
                file_size_bytes: recording.file_size_bytes,
                created_at: recording.created_at,
              }}
            />
            {endedAt && (
              <p className="text-xs text-muted-foreground">
                {fmtDateTime(endedAt)}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirm */}
      <ResponsiveConfirmDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>
              {t('screens.liverooms.past.deleteTitle')}
            </ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {t('screens.liverooms.past.deleteDescription')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>
              {t('screens.liverooms.past.deleteCancel')}
            </ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={() => {
                onDelete(stream.id);
                setConfirmDeleteOpen(false);
              }}
            >
              {t('screens.liverooms.past.deleteConfirm')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </div>
  );
}
