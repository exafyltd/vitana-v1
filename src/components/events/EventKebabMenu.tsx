import React, { useState } from "react";
import { Pencil, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu-kebab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface EventKebabMenuProps {
  event: any;
  currentUserId?: string | null;
  onEdit?: (event: any) => void;
  onDelete?: (eventId: string) => void;
  onShare?: (event: any) => void;
  className?: string;
}

export const EventKebabMenu: React.FC<EventKebabMenuProps> = ({
  event,
  currentUserId,
  onEdit,
  onDelete,
  onShare,
  className,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCreator = !!currentUserId && event.created_by === currentUserId;
  const isCoCreator = !!currentUserId && event.is_co_creator === true;
  const canEdit = (isCreator || isCoCreator) && new Date(event.start_time) > new Date();
  const canDelete = isCreator || isCoCreator;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("global_community_events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      notify('toasts.events.eventDeleted');

      setDeleteDialogOpen(false);
      onDelete?.(event.id);
    } catch (error) {
      console.error("Failed to delete event:", error);
      notifyError('toasts.events.failedDeleteEvent', 'toasts.events.pleaseTryAgainLater');
    } finally {
      setIsDeleting(false);
    }
  };

  // Non-creator/co-creator: show standalone Share button
  if (!canEdit && !canDelete) {
    if (!onShare) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 hover:bg-sidebar-accent/50 ${className}`}
        aria-label={t('screens.events.shareEvent')}
        onClick={(e) => { e.stopPropagation(); onShare(event); }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <KebabMenu className={className}>
        {canEdit && onEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit(event);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        {onShare && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onShare(event);
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </KebabMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('screens.events.deleteEvent')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
              All participants, tickets, and associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
