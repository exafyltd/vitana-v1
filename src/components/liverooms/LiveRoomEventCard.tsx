/**
 * The Live Room card as it appears in the Events & MeetUps list.
 *
 * Same data and test ids as LiveRoomCard, laid out like the other event cards:
 * a status badge and Share on top; host, title and blurb at the bottom; one
 * calm row of info pills (date, time, duration, "X going"); then the price
 * badge and one large call-to-action (Notify me / Join / Start).
 */
import { useState } from 'react';
import { Radio, CalendarDays, Timer, Users, Bell, Pencil, Trash2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu-kebab';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import { formatDuration } from '@/components/liverooms/liveRoomFormat';
import { InterestedPeopleSheet } from '@/components/liverooms/InterestedPeopleSheet';
import type { LiveRoomCardProps } from '@/components/liverooms/LiveRoomCard';

const pill =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md';

export function LiveRoomEventCard({
  room,
  onClick,
  onNotifyClick,
  onJoinClick,
  isNotifying = false,
  className,
  shareButton,
  isCreator = false,
  onEdit,
  onDelete,
}: LiveRoomCardProps) {
  const [imageError, setImageError] = useState(false);
  const [interestedOpen, setInterestedOpen] = useState(false);

  const isScheduled = !room.isLive && !!room.scheduledTime;
  const startIso = room.isLive ? room.startedAt || room.scheduledTime : room.scheduledTime;
  const durationLabel = formatDuration(room.durationMinutes);
  const going = room.interestedCount ?? 0;
  const dueForHost = isScheduled && !!room.startingSoon && isCreator;

  const cta = (e: React.MouseEvent, fn?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    fn?.(e);
  };

  return (
    <Card
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${room.title} - ${room.isLive ? t('screens.liverooms.live') : t('screens.liverooms.scheduled')}`}
      data-room-id={room.id}
      className={cn(
        'group relative flex h-full min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-3xl border-0 shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* Cover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        {room.imageUrl && !imageError ? (
          <img
            src={room.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-10">🎙️</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      </div>

      {/* Top row: status + share / host menu */}
      <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
        {room.isLive ? (
          <Badge
            data-testid="live-room-badge"
            className="gap-1.5 border-0 bg-red-500 px-3 py-1.5 text-xs text-white shadow-lg"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {t('screens.liverooms.live')}
          </Badge>
        ) : (
          <Badge className="gap-1.5 border-0 bg-emerald-500 px-3 py-1.5 text-xs text-white shadow-lg">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            {t('screens.liverooms.liveRoomTag')}
          </Badge>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {room.isLive && (
            <span
              data-testid="live-room-card-viewers"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {room.participants}
            </span>
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur-md [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-full [&_button]:text-white">
            {shareButton}
          </span>
          {isCreator && (
            <KebabMenu className="rounded-full bg-black/35 text-white backdrop-blur-md hover:bg-black/50">
              <DropdownMenuItem onClick={(e) => cta(e, onEdit)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('screens.liverooms.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => cta(e, onDelete)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('screens.liverooms.delete')}
              </DropdownMenuItem>
            </KebabMenu>
          )}
        </div>
      </div>

      {/* Bottom: host, title, blurb, info pills, price + CTA */}
      <div className="relative z-10 mt-auto flex flex-col gap-3 p-5 pb-16 pt-20 md:pb-5" data-testid="live-room-card-content">
        <div className="flex items-center gap-3">
          <ClickableAvatar
            userId={room.host.id}
            src={room.host.avatar}
            fallback={room.host.name[0]}
            alt={room.host.name}
            className="h-10 w-10 ring-2 ring-white/60"
            disabled={room.host.id.startsWith('demo-')}
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{room.host.name}</p>
            <p className="text-xs text-white/70">{t('screens.liverooms.host')}</p>
          </div>
          {room.location && (
            <span className={cn(pill, 'ms-auto shrink-0 px-2.5 py-1')}>
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {t('screens.liverooms.virtual')}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-xl font-bold leading-snug text-white drop-shadow">{room.title}</h3>
        {room.description && <p className="line-clamp-2 text-sm text-white/85">{room.description}</p>}

        {/* One row, never wrapping; sideways scroll is only a safety net for very long locales. */}
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="live-room-info-pills">
          {startIso && (
            <span className={pill} data-testid="live-room-date-time">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t('screens.liverooms.dateTimeChip', {
                date: formatDate(new Date(startIso), 'EEE, d. MMM'),
                time: formatDate(new Date(startIso), 'HH:mm'),
              })}
            </span>
          )}
          {durationLabel && (
            <span className={pill}>
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              {durationLabel}
            </span>
          )}
          {isScheduled && going > 0 && (
            <button
              type="button"
              data-testid="live-room-interested"
              className={cn(pill, 'min-h-[32px] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white')}
              aria-label={t('screens.liverooms.interestedAria')}
              onClick={(e) => {
                e.stopPropagation();
                setInterestedOpen(true);
              }}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t('screens.liverooms.willJoinCount', { count: going })}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {room.isPremium ? (
            <Badge variant="outline" className="border-yellow-400/60 bg-yellow-500/20 px-3 py-1.5 text-yellow-100 backdrop-blur-sm">
              {t('screens.liverooms.premium')}
            </Badge>
          ) : (
            <Badge className="border-0 bg-emerald-500 px-3 py-1.5 text-sm text-white">{t('screens.liverooms.free')}</Badge>
          )}

          {room.isLive ? (
            <Button
              data-testid="live-room-card-join"
              className="h-12 min-w-[150px] flex-1 rounded-full bg-white text-base font-semibold text-slate-900 hover:bg-white/90 sm:flex-none"
              onClick={(e) => cta(e, onJoinClick)}
              aria-label={isCreator ? t('screens.liverooms.manageAria') : t('screens.liverooms.joinAria')}
            >
              {isCreator ? t('screens.liverooms.manage') : t('screens.liverooms.join')}
            </Button>
          ) : dueForHost ? (
            <Button
              data-testid="live-room-card-start"
              className="h-12 min-w-[150px] flex-1 rounded-full bg-white text-base font-semibold text-slate-900 hover:bg-white/90 sm:flex-none"
              onClick={(e) => cta(e, onJoinClick)}
            >
              {t('screens.liveRoom.startNow')}
            </Button>
          ) : isScheduled ? (
            <Button
              data-testid="live-room-card-notify"
              className={cn(
                'h-12 min-w-[150px] flex-1 gap-2 rounded-full text-base font-semibold sm:flex-none',
                isNotifying
                  ? 'bg-white/25 text-white backdrop-blur-md hover:bg-white/30'
                  : 'bg-white text-slate-900 hover:bg-white/90',
              )}
              onClick={(e) => cta(e, onNotifyClick)}
              aria-label={isNotifying ? t('screens.liverooms.notifyAriaOn') : t('screens.liverooms.notifyAriaOff')}
            >
              <Bell className={cn('h-5 w-5', isNotifying && 'fill-current')} aria-hidden="true" />
              {isNotifying ? t('screens.liverooms.notifying') : t('screens.liverooms.notifyMe')}
            </Button>
          ) : null}
        </div>
      </div>

      {interestedOpen && (
        // Portal events bubble through React: keep taps in the sheet from opening the card.
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <InterestedPeopleSheet streamId={room.id} title={room.title} open={interestedOpen} onOpenChange={setInterestedOpen} />
        </div>
      )}
    </Card>
  );
}
