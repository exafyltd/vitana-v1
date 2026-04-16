import { useState } from "react";
import { MessageSquare, CalendarDays, Users, Plus, Send, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNotificationsNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  useNotificationCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useSendTestNotification,
  NotificationCategory,
} from "@/hooks/useAdminNotificationCategories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

// BOOTSTRAP-NOTIF-CATEGORIES: Admin notification category management page.
// Deploy timestamp: 2026-04-16T08:30Z (retry after billing/auth fix)
const TYPE_CONFIG = {
  chat: { label: "Chat", icon: MessageSquare, color: "text-blue-500" },
  calendar: { label: "Calendar", icon: CalendarDays, color: "text-amber-500" },
  community: { label: "Community", icon: Users, color: "text-green-500" },
} as const;

type NotificationType = "chat" | "calendar" | "community";

interface CategoryFormData {
  display_name: string;
  description: string;
  icon: string;
  default_enabled: boolean;
  mapped_types: string;
}

const EMPTY_FORM: CategoryFormData = {
  display_name: "",
  description: "",
  icon: "",
  default_enabled: true,
  mapped_types: "",
};

export default function Categories() {
  const { data: categories, isLoading } = useNotificationCategories({ include_inactive: true });
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const testMutation = useSendTestNotification();

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["chat", "calendar", "community"]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<NotificationType>("chat");
  const [editingCategory, setEditingCategory] = useState<NotificationCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<NotificationCategory | null>(null);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const openCreateDialog = (type: NotificationType) => {
    setEditingCategory(null);
    setDialogType(type);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (category: NotificationCategory) => {
    setEditingCategory(category);
    setDialogType(category.type);
    setForm({
      display_name: category.display_name,
      description: category.description || "",
      icon: category.icon || "",
      default_enabled: category.default_enabled,
      mapped_types: (category.mapped_types || []).join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const mappedTypesArray = form.mapped_types
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          display_name: form.display_name,
          description: form.description || undefined,
          icon: form.icon || undefined,
          default_enabled: form.default_enabled,
          mapped_types: mappedTypesArray,
        });
        toast({ title: "Category updated", description: `"${form.display_name}" has been updated.` });
      } else {
        await createMutation.mutateAsync({
          type: dialogType,
          display_name: form.display_name,
          description: form.description || undefined,
          icon: form.icon || undefined,
          default_enabled: form.default_enabled,
          mapped_types: mappedTypesArray,
        });
        toast({ title: "Category created", description: `"${form.display_name}" has been added.` });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Category removed", description: `"${deleteTarget.display_name}" has been deactivated.` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSendTest = async (category: NotificationCategory) => {
    try {
      await testMutation.mutateAsync(category.id);
      toast({ title: "Test sent", description: `Test notification sent for "${category.display_name}".` });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (category: NotificationCategory) => {
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        is_active: !category.is_active,
      });
      toast({
        title: category.is_active ? "Category deactivated" : "Category activated",
        description: `"${category.display_name}" is now ${category.is_active ? "inactive" : "active"}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <SubNavigation items={adminNotificationsNavigation} />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SubNavigation items={adminNotificationsNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          title="Notification Categories"
          description="Manage notification categories grouped by Chat, Calendar, and Community. Users can toggle these on/off in their settings."
        />

        {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((type) => {
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          const items = categories?.[type] || [];
          const isExpanded = expandedTypes.has(type);

          return (
            <Card key={type}>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleType(type)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    {config.label}
                    <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); openCreateDialog(type); }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No categories yet. Click "Add" to create one.
                    </p>
                  ) : (
                    items.map((cat) => (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          cat.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{cat.display_name}</h4>
                            {!cat.is_active && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                            {!cat.default_enabled && (
                              <Badge variant="secondary" className="text-xs">Opt-in</Badge>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {cat.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(cat.mapped_types || []).length} notification type(s) mapped
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={cat.is_active}
                            onCheckedChange={() => handleToggleActive(cat)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendTest(cat)}
                            disabled={testMutation.isPending || !cat.is_active}
                            title="Send test notification"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(cat)}
                            title="Edit category"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(cat)}
                            title="Delete category"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : `Add ${TYPE_CONFIG[dialogType].label} Category`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">Name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Direct Messages"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief explanation shown in user settings"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Lucide name)</Label>
              <Input
                id="icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="e.g. MessageSquare"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapped_types">Mapped Notification Types</Label>
              <Textarea
                id="mapped_types"
                value={form.mapped_types}
                onChange={(e) => setForm((f) => ({ ...f, mapped_types: e.target.value }))}
                placeholder="Comma-separated TYPE_META keys, e.g. new_chat_message, orb_suggestion"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                These are the internal notification type keys that this category controls.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  When on, new users have this category enabled by default.
                </p>
              </div>
              <Switch
                checked={form.default_enabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, default_enabled: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.display_name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingCategory ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the category. Users will no longer see it in their notification settings.
              Existing user preferences for this category will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
