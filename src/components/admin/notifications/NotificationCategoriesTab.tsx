/**
 * VTID-04675: Admin › Notifications › Categories tab.
 *
 * Categories are what members switch in Settings › Notifications. Each one
 * groups notification types. Here the admin sees which of those types are
 * switched on, marks categories members may not switch off (account and
 * security), and sees a live preview of the member screen: a category shows
 * there only when it is active and holds at least one switched-on type.
 */

import { useMemo, useState } from "react";
import { Lock, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  useCreateCategory,
  useDeleteCategory,
  useNotificationCategories,
  useSendTestNotification,
  useUpdateCategory,
  type NotificationCategory,
} from "@/hooks/useAdminNotificationCategories";
import { localized, useNotificationControls, type NotificationControl } from "@/hooks/useNotificationControls";
import { notify, notifyError, t, useI18nLocale } from "@/lib/i18n-toast";
import { visibleToMembers } from "@/lib/notifications/category-visibility";

type CategoryGroup = "chat" | "calendar" | "community";
const GROUPS: CategoryGroup[] = ["chat", "calendar", "community"];

interface FormState {
  display_name: string;
  description: string;
  default_enabled: boolean;
  member_can_disable: boolean;
  mapped_types: string[];
}

const EMPTY: FormState = {
  display_name: "",
  description: "",
  default_enabled: true,
  member_can_disable: true,
  mapped_types: [],
};

export function NotificationCategoriesTab() {
  const locale = useI18nLocale();
  const { data: categories, isLoading, error } = useNotificationCategories({ include_inactive: true });
  const { data: controls } = useNotificationControls(7);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const testMutation = useSendTestNotification();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogGroup, setDialogGroup] = useState<CategoryGroup>("community");
  const [editing, setEditing] = useState<NotificationCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<NotificationCategory | null>(null);

  const controlByType = useMemo(() => {
    const m = new Map<string, NotificationControl>();
    for (const c of controls?.controls || []) m.set(c.type, c);
    return m;
  }, [controls]);

  const enabledTypes = useMemo(
    () => new Set((controls?.controls || []).filter((c) => c.enabled).map((c) => c.type)),
    [controls],
  );

  const memberTypes = useMemo(
    () => (controls?.controls || []).filter((c) => c.audience === "member").sort((a, b) => a.group.localeCompare(b.group)),
    [controls],
  );

  const typeLabel = (type: string) => {
    const c = controlByType.get(type);
    return c ? localized(c.label, locale) : type;
  };

  const openCreate = (group: CategoryGroup) => {
    setEditing(null);
    setDialogGroup(group);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (cat: NotificationCategory) => {
    setEditing(cat);
    setDialogGroup(cat.type);
    setForm({
      display_name: cat.display_name,
      description: cat.description || "",
      default_enabled: cat.default_enabled,
      member_can_disable: cat.member_can_disable !== false,
      mapped_types: cat.mapped_types || [],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          display_name: form.display_name,
          description: form.description || undefined,
          default_enabled: form.default_enabled,
          member_can_disable: form.member_can_disable,
          mapped_types: form.mapped_types,
        });
        notify("toasts.admin.categoryUpdated");
      } else {
        await createMutation.mutateAsync({
          type: dialogGroup,
          display_name: form.display_name,
          description: form.description || undefined,
          default_enabled: form.default_enabled,
          member_can_disable: form.member_can_disable,
          mapped_types: form.mapped_types,
        });
        notify("toasts.admin.categoryCreated");
      }
      setDialogOpen(false);
    } catch {
      notifyError("toasts.admin.error");
    }
  };

  const toggleActive = async (cat: NotificationCategory) => {
    try {
      await updateMutation.mutateAsync({ id: cat.id, is_active: !cat.is_active });
    } catch {
      notifyError("toasts.admin.error");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      notify("toasts.admin.categoryRemoved");
      setDeleteTarget(null);
    } catch {
      notifyError("toasts.admin.error");
    }
  };

  const sendTest = async (cat: NotificationCategory) => {
    try {
      await testMutation.mutateAsync(cat.id);
      notify("toasts.admin.testSent");
    } catch {
      notifyError("toasts.admin.sendFailed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("notificationControls.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          {t("notificationControls.categories.loadError", { message: (error as Error).message })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <p className="text-sm text-muted-foreground">{t("notificationControls.categories.intro")}</p>
        {GROUPS.map((group) => {
          const items = categories?.[group] || [];
          return (
            <Card key={group}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{t(`notificationControls.categoryGroups.${group}`)}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => openCreate(group)}>
                  <Plus className="me-1 h-4 w-4" />
                  {t("notificationControls.categories.add")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">{t("notificationControls.categories.empty")}</p>
                )}
                {items.map((cat) => {
                  const shown = visibleToMembers(cat, enabledTypes);
                  return (
                    <div
                      key={cat.id}
                      className={`space-y-2 rounded-lg border p-3 ${cat.is_active ? "" : "opacity-60"}`}
                      data-testid={`category-${cat.slug}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{cat.display_name}</span>
                            {cat.member_can_disable === false && (
                              <Badge variant="secondary">
                                <Lock className="me-1 h-3 w-3" />
                                {t("notificationControls.categories.locked")}
                              </Badge>
                            )}
                            {!cat.default_enabled && (
                              <Badge variant="outline">{t("notificationControls.categories.optIn")}</Badge>
                            )}
                            <Badge variant={shown ? "default" : "outline"}>
                              {shown
                                ? t("notificationControls.categories.shownToMembers")
                                : t("notificationControls.categories.hiddenFromMembers")}
                            </Badge>
                          </div>
                          {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Switch
                            checked={cat.is_active}
                            onCheckedChange={() => toggleActive(cat)}
                            aria-label={t("notificationControls.categories.active")}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendTest(cat)}
                            disabled={testMutation.isPending || !cat.is_active}
                            title={t("notificationControls.categories.sendTest")}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(cat)} title={t("notificationControls.categories.edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(cat)}
                            title={t("notificationControls.categories.remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(cat.mapped_types || []).map((type) => (
                          <Badge
                            key={type}
                            variant={enabledTypes.has(type) ? "secondary" : "outline"}
                            className={enabledTypes.has(type) ? "" : "text-muted-foreground line-through"}
                            title={type}
                          >
                            {typeLabel(type)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="lg:col-span-2">
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">{t("notificationControls.categories.previewTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("notificationControls.categories.previewHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="member-preview">
            {GROUPS.map((group) => {
              const shown = (categories?.[group] || []).filter((c) => visibleToMembers(c, enabledTypes));
              if (shown.length === 0) return null;
              return (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {t(`notificationControls.categoryGroups.${group}`)}
                  </p>
                  {shown.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.display_name}</p>
                        {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                      {c.member_can_disable === false ? (
                        <Lock className="h-4 w-4 text-muted-foreground" aria-label={t("notificationControls.categories.locked")} />
                      ) : (
                        <Switch checked={c.default_enabled} disabled aria-label={c.display_name} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("notificationControls.categories.editTitle") : t("notificationControls.categories.addTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t("notificationControls.categories.name")}</Label>
              <Input
                id="cat-name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t("notificationControls.categories.description")}</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>{t("notificationControls.categories.defaultOn")}</Label>
                <p className="text-xs text-muted-foreground">{t("notificationControls.categories.defaultOnHint")}</p>
              </div>
              <Switch
                checked={form.default_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, default_enabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>{t("notificationControls.categories.memberCanDisable")}</Label>
                <p className="text-xs text-muted-foreground">{t("notificationControls.categories.memberCanDisableHint")}</p>
              </div>
              <Switch
                checked={form.member_can_disable}
                onCheckedChange={(v) => setForm((f) => ({ ...f, member_can_disable: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("notificationControls.categories.types")}</Label>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {memberTypes.map((c) => {
                  const checked = form.mapped_types.includes(c.type);
                  return (
                    <label key={c.type} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            mapped_types: v
                              ? [...f.mapped_types, c.type]
                              : f.mapped_types.filter((x) => x !== c.type),
                          }))
                        }
                      />
                      <span className="flex-1">{localized(c.label, locale)}</span>
                      <span className={c.enabled ? "text-xs text-green-600" : "text-xs text-muted-foreground"}>
                        {c.enabled ? t("notificationControls.on") : t("notificationControls.off")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("notificationControls.cancel")}
            </Button>
            <Button onClick={save} disabled={!form.display_name || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("notificationControls.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notificationControls.categories.removeTitle", { name: deleteTarget?.display_name || "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("notificationControls.categories.removeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notificationControls.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{t("notificationControls.categories.remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NotificationCategoriesTab;
