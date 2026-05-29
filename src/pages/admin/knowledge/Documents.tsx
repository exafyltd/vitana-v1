/**
 * Knowledge > Documents — unified tree view of all KB scopes.
 *
 * Layout: global search (top) + tree (left) + viewer (right). Three scopes:
 *   📖 Vitana Platform  — system-wide docs from knowledge_docs (exafy-admin editable
 *                         elsewhere; read-only here)
 *   📚 Baseline Library — kb_documents baseline (opt-out per tenant)
 *   🏢 Your Tenant Docs — kb_documents owned by this tenant (full CRUD)
 *
 * Replaces the previous flat table + the separate System KB tab (dropped).
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, BookOpen, Library, Building2 } from "lucide-react";
import {
  useUnifiedKbTree,
  useUnifiedKbSystemDoc,
  useEditSystemDoc,
  useEditBaselineDoc,
  type KbScope,
  type UnifiedKbDocEntry,
  type UnifiedKbGroup,
} from "@/hooks/useUnifiedKb";
import {
  useKBDocument,
  useCreateKBDocument,
  useDeleteKBDocument,
  useReindexKBDocument,
  useKBBaselineOptout,
} from "@/hooks/useAdminKnowledge";
import { useTenant } from "@/hooks/useTenant";
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
import { notifySuccess, t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
type Selected = { scope: KbScope; id: string; title: string } | null;

interface ScopeConfig {
  key: KbScope;
  label: string;
  Icon: typeof BookOpen;
  emptyHint: string;
}

const SCOPES: ScopeConfig[] = [
  { key: "system", label: "Vitana Platform", Icon: BookOpen, emptyHint: "No platform docs loaded." },
  { key: "baseline", label: "Baseline Library", Icon: Library, emptyHint: "No baseline docs." },
  { key: "tenant", label: "Your Tenant Docs", Icon: Building2, emptyHint: "Empty — upload a doc to start." },
];

export default function KnowledgeDocuments() {
  const treeQuery = useUnifiedKbTree();
  const tree = treeQuery.data;

  const [selected, setSelected] = useState<Selected>(null);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [searchParams] = useSearchParams();

  // Deep-link support: ?doc=<id>&scope=<scope> pre-selects a doc once the tree
  // loads. Used by the Command Hub "Edit in Vitanaland →" cross-link.
  useEffect(() => {
    if (!tree) return;
    const docId = searchParams.get("doc");
    const scopeParam = searchParams.get("scope") as KbScope | null;
    if (!docId) return;
    const scopes: KbScope[] = scopeParam ? [scopeParam] : ["system", "baseline", "tenant"];
    for (const s of scopes) {
      for (const g of tree[s]) {
        const hit = g.docs.find((d) => d.id === docId);
        if (hit) {
          setSelected({ scope: s, id: hit.id, title: hit.title });
          return;
        }
      }
    }
  }, [tree, searchParams]);

  // --- Search filter ---
  const filteredTree = useMemo(() => {
    if (!tree) return null;
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const filterScope = (groups: UnifiedKbGroup[]): UnifiedKbGroup[] =>
      groups
        .map((g) => ({
          group: g.group,
          docs: g.docs.filter(
            (d) =>
              d.title.toLowerCase().includes(q) ||
              (d.path || "").toLowerCase().includes(q) ||
              (d.topics || []).some((t) => t.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.docs.length > 0);
    return {
      system: filterScope(tree.system),
      baseline: filterScope(tree.baseline),
      tenant: filterScope(tree.tenant),
    };
  }, [tree, search]);

  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📚"
          title={t('screens.admin.knowledgeBaseDocuments')}
          description="All Vitana knowledge in one place: system docs that ground the Assistant, baseline library shared across tenants, and your own tenant docs."
          rightAction={
            <Button size="sm" onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? "Cancel upload" : "Upload Document"}
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('screens.admin.searchAcrossAllScopesTitlePath')}
            />
          </CardContent>
        </Card>

        {showUpload && (
          <UploadCard
            onDone={() => {
              setShowUpload(false);
              treeQuery.refetch();
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: tree */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              {treeQuery.isLoading && (
                <p className="text-sm text-muted-foreground">{t('screens.admin.loadingTree')}</p>
              )}
              {treeQuery.isError && (
                <p className="text-sm text-destructive">{t('screens.admin.failedLoadKbTreeRefreshRetry')}
                </p>
              )}
              {filteredTree && (
                <ScrollArea className="h-[65vh] pr-3">
                  <div className="space-y-4">
                    {SCOPES.map((scope) => (
                      <ScopeSection
                        key={scope.key}
                        scope={scope}
                        groups={filteredTree[scope.key]}
                        selected={selected}
                        onSelect={(d) =>
                          setSelected({ scope: scope.key, id: d.id, title: d.title })
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Right: viewer */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              {!selected && (
                <AdminEmptyState
                  title={t('screens.admin.pickDocument')}
                  description="Select a document from the tree on the left to read its content and manage it."
                />
              )}
              {selected && (
                <DocViewer
                  selected={selected}
                  onDeleted={() => {
                    setSelected(null);
                    treeQuery.refetch();
                  }}
                  onOptoutChanged={() => treeQuery.refetch()}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

// ---- Tree section per scope ------------------------------------------------

function ScopeSection({
  scope,
  groups,
  selected,
  onSelect,
}: {
  scope: ScopeConfig;
  groups: UnifiedKbGroup[];
  selected: Selected;
  onSelect: (d: UnifiedKbDocEntry) => void;
}) {
  const [open, setOpen] = useState(true);
  const { Icon } = scope;
  const total = groups.reduce((n, g) => n + g.docs.length, 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold py-1"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Icon className="h-4 w-4" />
        <span>{scope.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{total}</span>
      </button>
      {open && (
        <div className="pl-5 mt-1 space-y-2">
          {total === 0 && (
            <p className="text-xs text-muted-foreground py-1">{scope.emptyHint}</p>
          )}
          {groups.map((g) => (
            <TreeGroup
              key={g.group}
              group={g}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeGroup({
  group,
  selected,
  onSelect,
}: {
  group: UnifiedKbGroup;
  selected: Selected;
  onSelect: (d: UnifiedKbDocEntry) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground py-0.5"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{group.group}</span>
        <span className="ml-1">({group.docs.length})</span>
      </button>
      {open && (
        <ul className="pl-4 mt-0.5 space-y-0.5">
          {group.docs.map((d) => {
            const isActive = selected && selected.id === d.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onSelect(d)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  } ${d.is_opted_out ? "opacity-60" : ""}`}
                  title={d.path || d.title}
                >
                  <div className="truncate">{d.title}</div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---- Viewer ----------------------------------------------------------------

function DocViewer({
  selected,
  onDeleted,
  onOptoutChanged,
}: {
  selected: NonNullable<Selected>;
  onDeleted: () => void;
  onOptoutChanged: () => void;
}) {
  if (selected.scope === "system") {
    return <SystemDocViewer id={selected.id} />;
  }
  return (
    <KbDocViewer
      scope={selected.scope}
      id={selected.id}
      onDeleted={onDeleted}
      onOptoutChanged={onOptoutChanged}
    />
  );
}

function SystemDocViewer({ id }: { id: string }) {
  const query = useUnifiedKbSystemDoc(id);
  const { isExafyAdmin } = useTenant();
  const editMutation = useEditSystemDoc();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset edit state whenever the selected doc changes.
  useEffect(() => {
    setEditing(false);
    setConfirmOpen(false);
  }, [id]);

  if (query.isLoading) return <p className="text-sm text-muted-foreground">{t('screens.admin.loading2')}</p>;
  if (!query.data)
    return <p className="text-sm text-destructive">{t('screens.admin.documentNotFound')}</p>;
  const doc = query.data;
  const gatewayBase = (import.meta.env.VITE_GATEWAY_BASE as string) || "";
  const commandHubUrl = gatewayBase
    ? `${gatewayBase}/command-hub/docs/system-knowledge/?doc=${encodeURIComponent(doc.id)}`
    : null;

  function startEdit() {
    setTitle(doc.title);
    setContent(doc.content);
    setTagsCsv((doc.tags || []).join(", "));
    setEditing(true);
  }

  async function doSave() {
    try {
      await editMutation.mutateAsync({
        id: doc.id,
        title: title.trim() || doc.title,
        content,
        tags: tagsCsv
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      notifySuccess('toasts.admin.systemDocUpdatedAppliesAcrossAll');
      setEditing(false);
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px]">{t('screens.admin.platform')}</Badge>
          {!editing && !isExafyAdmin && (
            <span className="text-xs text-muted-foreground">{t('screens.admin.readonly')}</span>
          )}
          {editing && (
            <span className="text-xs text-amber-600 font-medium">{t('screens.admin.editing')}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {commandHubUrl && !editing && (
              <a
                href={commandHubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {t('screens.admin.viewCommandHub')}
              </a>
            )}
            {isExafyAdmin && !editing && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                {t('screens.admin.edit')}
              </Button>
            )}
          </div>
        </div>
        {editing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
        ) : (
          <h2 className="text-xl font-semibold">{doc.title}</h2>
        )}
        <p className="text-xs text-muted-foreground mt-1 break-all">{doc.path}</p>
        {editing ? (
          <Input
            value={tagsCsv}
            onChange={(e) => setTagsCsv(e.target.value)}
            placeholder={t('screens.admin.tagsCommaseparated')}
            className="mt-2 text-xs"
          />
        ) : (
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.tags?.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
      ) : (
        <ScrollArea className="h-[55vh] rounded-md border p-4 bg-muted/30">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {doc.content}
          </pre>
        </ScrollArea>
      )}

      {editing ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={editMutation.isPending}
          >
            {editMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={editMutation.isPending}
          >
            {t('screens.admin.cancel')}
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {t('screens.admin.savingWillApplyEveryTenantImmediately')}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('screens.admin.value0WordsUpdatedValue1', { value0: doc.word_count ?? 0, value1: fmtDateTime(new Date(doc.updated_at)) })}</p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('screens.admin.editPlatformDocument')}</AlertDialogTitle>
            <AlertDialogDescription>{t('screens.admin.thisDocumentPartVitanaSystemKnowledge')} <b>{t('screens.admin.everyTenant')}</b>{t('screens.admin.includingBookVitanaIndexIfThis')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editMutation.isPending}>
              {t('screens.admin.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doSave();
              }}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Saving…" : "Yes, save for all tenants"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KbDocViewer({
  scope,
  id,
  onDeleted,
  onOptoutChanged,
}: {
  scope: "baseline" | "tenant";
  id: string;
  onDeleted: () => void;
  onOptoutChanged: () => void;
}) {
  const query = useKBDocument(id);
  const deleteMutation = useDeleteKBDocument();
  const reindexMutation = useReindexKBDocument();
  const optoutMutation = useKBBaselineOptout();
  const editBaselineMutation = useEditBaselineDoc();
  const { isExafyAdmin } = useTenant();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTopicsCsv, setEditTopicsCsv] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setEditing(false);
    setConfirmOpen(false);
  }, [id]);

  if (query.isLoading) return <p className="text-sm text-muted-foreground">{t('screens.admin.loading2')}</p>;
  if (!query.data)
    return <p className="text-sm text-destructive">{t('screens.admin.documentNotFound')}</p>;

  const doc = query.data;

  function startEdit() {
    setEditTitle(doc.title);
    setEditBody(doc.body ?? "");
    setEditTopicsCsv((doc.topics || []).join(", "));
    setEditing(true);
  }

  async function doSaveBaseline() {
    try {
      await editBaselineMutation.mutateAsync({
        id: doc.id,
        title: editTitle.trim() || doc.title,
        body: editBody,
        topics: editTopicsCsv
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      notifySuccess('toasts.admin.baselineDocUpdatedAppliesAllNonoptedout');
      setEditing(false);
      setConfirmOpen(false);
      onOptoutChanged(); // refresh tree so title update shows
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
      setConfirmOpen(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      notifySuccess('toasts.admin.documentDeleted');
      onDeleted();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  async function handleReindex() {
    try {
      await reindexMutation.mutateAsync(id);
      notifySuccess('toasts.admin.reindexTriggered');
    } catch (err: any) {
      toast.error(err.message || "Failed to reindex");
    }
  }

  async function handleOptout(optOut: boolean) {
    try {
      await optoutMutation.mutateAsync({ documentId: id, optOut });
      toast.success(optOut ? "Opted out of baseline doc" : "Opted back in");
      onOptoutChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to update opt-out");
    }
  }

  const statusVariant =
    doc.status === "indexed" ? "active" : doc.status === "failed" ? "error" : "warning";

  const canEditBaseline = scope === "baseline" && isExafyAdmin;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={scope === "baseline" ? "secondary" : "default"} className="text-[10px]">
            {scope}
          </Badge>
          <AdminStatusBadge variant={statusVariant as any}>{doc.status}</AdminStatusBadge>
          {editing && (
            <span className="text-xs text-amber-600 font-medium">{t('screens.admin.editing')}</span>
          )}
          {canEditBaseline && !editing && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={startEdit}
            >
              {t('screens.admin.edit')}
            </Button>
          )}
        </div>
        {editing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-lg font-semibold"
          />
        ) : (
          <h2 className="text-xl font-semibold">{doc.title}</h2>
        )}
        {editing ? (
          <Input
            value={editTopicsCsv}
            onChange={(e) => setEditTopicsCsv(e.target.value)}
            placeholder={t('screens.admin.topicsCommaseparated')}
            className="mt-2 text-xs"
          />
        ) : (
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.topics?.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <Textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={16}
          className="font-mono text-sm"
        />
      ) : (
        <ScrollArea className="h-[50vh] rounded-md border p-4 bg-muted/30">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {doc.body || "(no body)"}
          </pre>
        </ScrollArea>
      )}

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={editBaselineMutation.isPending}
            >
              {editBaselineMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={editBaselineMutation.isPending}
            >
              {t('screens.admin.cancel')}
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {t('screens.admin.appliesAllNonoptedoutTenants')}
            </span>
          </>
        ) : scope === "tenant" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReindex}
              disabled={reindexMutation.isPending}
            >
              {t('screens.admin.reindex')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive"
            >{t('screens.admin.delete')}
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">{t('screens.admin.updatedValue02', { value0: fmtDateTime(new Date(doc.updated_at)) })}</span>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={doc.is_opted_out}
                onCheckedChange={(v) => handleOptout(!!v)}
                disabled={optoutMutation.isPending}
              />
              {t('screens.admin.optOutThisBaselineDocFor')}
            </label>
            <span className="text-xs text-muted-foreground ml-auto">{t('screens.admin.updatedValue02', { value0: fmtDateTime(new Date(doc.updated_at)) })}</span>
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('screens.admin.editBaselineDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('screens.admin.thisDocumentSharedAcross')} <b>{t('screens.admin.allTenants')}</b>{t('screens.admin.savingAppliesYourChangesImmediatelyEvery')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editBaselineMutation.isPending}>
              {t('screens.admin.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doSaveBaseline();
              }}
              disabled={editBaselineMutation.isPending}
            >
              {editBaselineMutation.isPending ? "Saving…" : "Yes, save for all tenants"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Upload form -----------------------------------------------------------

function UploadCard({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateKBDocument();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState("");

  async function submit() {
    if (!title.trim()) return;
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim() || undefined,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      notifySuccess('toasts.admin.documentCreated');
      setTitle("");
      setBody("");
      setTopics("");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <p className="text-xs text-muted-foreground">
          {t('screens.admin.uploadGoes')} <span className="font-medium">{t('screens.admin.yourTenantDocs')}</span>.
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('screens.admin.documentTitle')}
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('screens.admin.documentBody')}
          rows={4}
        />
        <Input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder={t('screens.admin.topicsCommaseparated')}
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={!title.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? "Creating…" : "Create Document"}
        </Button>
      </CardContent>
    </Card>
  );
}
