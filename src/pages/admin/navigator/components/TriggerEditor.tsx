/**
 * VTID-NAV-02: Catalog entry editor.
 *
 * Edits/creates a single nav_catalog row: screen_id, route, category,
 * access, priority, related KB topics, context rules, per-language i18n
 * (title + description + when_to_visit — the primary trigger text), and
 * override triggers (exact-phrase bypasses).
 *
 * The form is deliberately minimal — shadcn inputs, no heavy form lib.
 * Validation matches the backend validator in admin-navigator.ts.
 */

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  NavCatalogRow,
  NavOverrideTrigger,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
} from "@/hooks/useAdminNavigator";
import { t } from '@/lib/i18n-toast';

const CATEGORIES = [
  "public", "auth", "community", "business", "wallet", "health",
  "discover", "home", "memory", "ai", "inbox", "settings",
] as const;

interface TriggerEditorProps {
  entry: NavCatalogRow | null; // null = create mode
  onSaved?: (row: NavCatalogRow) => void;
  onClose?: () => void;
}

type I18nMap = Record<string, { title: string; description: string; when_to_visit: string }>;

function blankEntry(): {
  screen_id: string;
  route: string;
  category: string;
  access: "public" | "authenticated";
  anonymous_safe: boolean;
  priority: number;
  i18n: I18nMap;
  override_triggers: NavOverrideTrigger[];
  related_kb_topics: string[];
} {
  return {
    screen_id: "",
    route: "/",
    category: "home",
    access: "authenticated",
    anonymous_safe: false,
    priority: 0,
    i18n: { en: { title: "", description: "", when_to_visit: "" } },
    override_triggers: [],
    related_kb_topics: [],
  };
}

export function TriggerEditor({ entry, onSaved, onClose }: TriggerEditorProps) {
  const createMutation = useCreateCatalogEntry();
  const updateMutation = useUpdateCatalogEntry();
  const deleteMutation = useDeleteCatalogEntry();

  const [form, setForm] = useState(blankEntry());
  const [activeLang, setActiveLang] = useState("en");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      const i18n: I18nMap = {};
      for (const r of entry.i18n || []) {
        i18n[r.lang] = {
          title: r.title || "",
          description: r.description || "",
          when_to_visit: r.when_to_visit || "",
        };
      }
      if (!i18n.en) i18n.en = { title: "", description: "", when_to_visit: "" };
      setForm({
        screen_id: entry.screen_id,
        route: entry.route,
        category: entry.category,
        access: entry.access,
        anonymous_safe: entry.anonymous_safe,
        priority: entry.priority,
        i18n,
        override_triggers: entry.override_triggers || [],
        related_kb_topics: entry.related_kb_topics || [],
      });
      setActiveLang("en");
    } else {
      setForm(blankEntry());
    }
    setValidationError(null);
  }, [entry]);

  const isCreate = !entry;

  function setI18nField(lang: string, field: "title" | "description" | "when_to_visit", value: string) {
    setForm((f) => ({
      ...f,
      i18n: {
        ...f.i18n,
        [lang]: { ...(f.i18n[lang] || { title: "", description: "", when_to_visit: "" }), [field]: value },
      },
    }));
  }

  function addLang(lang: string) {
    if (!lang || form.i18n[lang]) return;
    setForm((f) => ({
      ...f,
      i18n: { ...f.i18n, [lang]: { title: "", description: "", when_to_visit: "" } },
    }));
    setActiveLang(lang);
  }

  function addOverride() {
    setForm((f) => ({
      ...f,
      override_triggers: [...f.override_triggers, { lang: activeLang, phrase: "", active: true }],
    }));
  }

  function updateOverride(i: number, patch: Partial<NavOverrideTrigger>) {
    setForm((f) => ({
      ...f,
      override_triggers: f.override_triggers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  }

  function removeOverride(i: number) {
    setForm((f) => ({ ...f, override_triggers: f.override_triggers.filter((_, idx) => idx !== i) }));
  }

  async function onSave() {
    setValidationError(null);
    if (!form.screen_id.trim()) return setValidationError("screen_id is required");
    if (!form.route.startsWith("/")) return setValidationError("route must start with /");
    if (!form.i18n.en?.title || !form.i18n.en?.when_to_visit) {
      return setValidationError("English title and when_to_visit are required");
    }
    try {
      const payload = {
        screen_id: form.screen_id.trim(),
        route: form.route.trim(),
        category: form.category,
        access: form.access,
        anonymous_safe: form.anonymous_safe,
        priority: form.priority,
        i18n: form.i18n,
        override_triggers: form.override_triggers,
        related_kb_topics: form.related_kb_topics,
      } as any;
      const saved = isCreate
        ? await createMutation.mutateAsync(payload)
        : await updateMutation.mutateAsync({ id: entry!.id, patch: payload });
      onSaved?.(saved);
    } catch (err: any) {
      setValidationError(err?.message || "Save failed");
    }
  }

  async function onDelete() {
    if (!entry) return;
    if (!confirm(`Soft-delete ${entry.screen_id}? It will be hidden from the Navigator but kept in audit history.`)) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      onClose?.();
    } catch (err: any) {
      setValidationError(err?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-5">
      {validationError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="screen_id">{t('screens.admin.screenId')}</Label>
          <Input
            id="screen_id"
            value={form.screen_id}
            onChange={(e) => setForm((f) => ({ ...f, screen_id: e.target.value }))}
            placeholder={t('screens.admin.homeMatches')}
            disabled={!isCreate}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="route">{t('screens.admin.route')}</Label>
          <Input
            id="route"
            value={form.route}
            onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))}
            placeholder={t('screens.admin.homematches')}
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">{t('screens.admin.category')}</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="access">{t('screens.admin.access')}</Label>
          <Select
            value={form.access}
            onValueChange={(v: any) => setForm((f) => ({ ...f, access: v }))}
          >
            <SelectTrigger id="access">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t('screens.admin.public')}</SelectItem>
              <SelectItem value="authenticated">{t('screens.admin.authenticated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">{t('screens.admin.priority010')}</Label>
          <Input
            id="priority"
            type="number"
            min={0}
            max={10}
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({ ...f, priority: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) }))
            }
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.anonymous_safe}
          onChange={(e) => setForm((f) => ({ ...f, anonymous_safe: e.target.checked }))}
          className="rounded border-input"
        />
        <span>{t('screens.admin.anonymousSafeCanRecommendedUnauthenticatedSessions')}</span>
      </label>

      {/* ── i18n (the trigger text lives here) ───────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('screens.admin.triggerPhrasesLocalizedCopy')}</Label>
          <div className="flex gap-1">
            {["de", "es", "fr", "pt"].map((l) =>
              form.i18n[l] ? null : (
                <Button key={l} size="sm" variant="ghost" onClick={() => addLang(l)}>
                  + {l}
                </Button>
              )
            )}
          </div>
        </div>
        <Tabs value={activeLang} onValueChange={setActiveLang}>
          <TabsList>
            {Object.keys(form.i18n).map((lang) => (
              <TabsTrigger key={lang} value={lang}>
                {lang.toUpperCase()}
                {lang === "en" && <span className="ml-1 text-xs text-muted-foreground">{t('screens.admin.required')}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(form.i18n).map(([lang, content]) => (
            <TabsContent key={lang} value={lang} className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label>{t('screens.admin.title')}</Label>
                <Input value={content.title} onChange={(e) => setI18nField(lang, "title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('screens.admin.description')}</Label>
                <Input
                  value={content.description}
                  onChange={(e) => setI18nField(lang, "description", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  {t('screens.admin.whenVisit')} <span className="text-xs text-muted-foreground">{t('screens.admin.whatUserSaysThatShouldLand')}</span>
                </Label>
                <Textarea
                  rows={5}
                  value={content.when_to_visit}
                  onChange={(e) => setI18nField(lang, "when_to_visit", e.target.value)}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Override triggers ─────────────────────────────────────────────── */}
      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('screens.admin.overrideTriggers')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.exactmatchPhrasesThatForceThisScreen')}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addOverride}>
            <Plus className="mr-1 h-4 w-4" /> {t('screens.admin.add')}
          </Button>
        </div>
        {form.override_triggers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t('screens.admin.noOverridesDefined')}</p>
        ) : (
          <div className="space-y-2">
            {form.override_triggers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={t.lang} onValueChange={(v) => updateOverride(i, { lang: v })}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('screens.admin.en')}</SelectItem>
                    <SelectItem value="de">{t('screens.admin.de')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={t.phrase}
                  onChange={(e) => updateOverride(i, { phrase: e.target.value })}
                  placeholder={t('screens.admin.openMyWallet')}
                  className="flex-1"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={t.active}
                    onChange={(e) => updateOverride(i, { active: e.target.checked })}
                  />
                  {t('screens.admin.active2')}
                </label>
                <Button size="icon" variant="ghost" onClick={() => removeOverride(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <div>
          {entry && (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('screens.admin.delete2')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              {t('screens.admin.cancel')}
            </Button>
          )}
          <Button onClick={onSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {entry && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{entry.id.slice(0, 8)}</Badge>
          <span>{t('screens.admin.updatedValue0Value1', { value0: " ", value1: entry.updated_at ? new Date(entry.updated_at).toLocaleString() : "—" })}</span>
          {entry.tenant_id ? (
            <Badge variant="secondary">{t('screens.admin.tenantValue0', { value0: entry.tenant_id.slice(0, 8) })}</Badge>
          ) : (
            <Badge variant="secondary">{t('screens.admin.shared')}</Badge>
          )}
        </div>
      )}
    </div>
  );
}
