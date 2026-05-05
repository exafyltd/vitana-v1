/**
 * Community > Meetups — Event supervision dashboard
 *
 * Shows all events/meetups sorted by date (next upcoming first).
 * Each row shows: title, organizer, registered/max capacity, price,
 * date/time, location, and a delete button with confirmation.
 */

import { useState } from "react";
import { Trash2, ExternalLink, MapPin, Calendar, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCommunityMeetups, useDeleteEvent } from "@/hooks/useAdminCommunity";
import { t } from '@/lib/i18n-toast';

export default function Meetups() {
  const { data: meetups = [], isLoading, isError, error } = useCommunityMeetups();
  const deleteMutation = useDeleteEvent();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Filter by search
  const filtered = meetups.filter((m: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.title || "").toLowerCase().includes(q)
      || (m.organizer?.display_name || "").toLowerCase().includes(q)
      || (m.location || "").toLowerCase().includes(q);
  });

  // Sort by start_time ascending (next upcoming first)
  const sorted = [...filtered].sort((a: any, b: any) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  // Split into upcoming vs past
  const now = new Date();
  const upcoming = sorted.filter((m: any) => new Date(m.start_time) >= now);
  const past = sorted.filter((m: any) => new Date(m.start_time) < now);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  function formatPrice(event: any) {
    if (event.price === null || event.price === undefined) return "Free";
    if (event.price === 0) return "Free";
    return `${event.price} ${event.currency || "EUR"}`;
  }

  function formatCapacity(event: any) {
    const registered = event.participant_count || 0;
    const max = event.max_participants;
    if (!max) return `${registered} registered`;
    return `${registered}/${max}`;
  }

  function capacityVariant(event: any): "active" | "warning" | "error" {
    const registered = event.participant_count || 0;
    const max = event.max_participants;
    if (!max) return "active";
    const ratio = registered / max;
    if (ratio >= 0.9) return "error";
    if (ratio >= 0.7) return "warning";
    return "active";
  }

  function renderTable(events: any[], label: string) {
    if (events.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label} ({events.length})</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>{t('screens.admin.dateTime')}</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {m.image_url && (
                        <img src={m.image_url} alt="" className="h-8 w-12 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate max-w-[200px]">{m.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{m.event_type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.organizer?.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {(m.organizer?.display_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[120px]">
                        {m.organizer?.display_name || m.organizer?.email || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{new Date(m.start_time).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.end_time && ` – ${new Date(m.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.location ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">{m.location}</span>
                      </div>
                    ) : m.virtual_link ? (
                      <a href={m.virtual_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Virtual
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge variant={capacityVariant(m)}>
                      <Users className="h-3 w-3 mr-1 inline" />
                      {formatCapacity(m)}
                    </AdminStatusBadge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{formatPrice(m)}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: m.id, title: m.title })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📅"
          title={t('screens.admin.eventsMeetups')}
          description={`${meetups.length} event${meetups.length !== 1 ? "s" : ""} — ${upcoming.length} upcoming, ${past.length} past`}
        />

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, organizer, or location..."
          onReset={() => setSearch("")}
        />

        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingEvents')}</p>}

        {isError && (
          <p className="text-sm text-destructive text-center py-8">
            Failed to load events: {(error as Error)?.message || "Unknown error"}
          </p>
        )}

        {!isLoading && meetups.length === 0 && (
          <AdminEmptyState title={t('screens.admin.noEventsFound')} description="No community events or meetups exist yet." />
        )}

        {renderTable(upcoming, "Upcoming Events")}
        {renderTable(past, "Past Events")}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('screens.admin.youSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event "{deleteTarget?.title}". This action cannot be undone.
              All attendees and ticket data associated with this event will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
