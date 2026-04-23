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
          title="Knowledge Base Documents"
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
              placeholder="Search across all scopes (title, path, tags)…"
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
                <p className="text-sm text-muted-foreground">Loading tree…</p>
              )}
              {treeQuery.isError && (
                <p className="text-sm text-destructive">
                  Failed to load KB tree. Refresh to retry.
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
                  title="Pick a document"
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
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!query.data)
    return <p className="text-sm text-destructive">Document not found.</p>;
  const doc = query.data;
  const gatewayBase = (import.meta.env.VITE_GATEWAY_BASE as string) || "";
  const commandHubUrl = gatewayBase
    ? `${gatewayBase}/command-hub/docs/system-knowledge/?doc=${encodeURIComponent(doc.id)}`
    : null;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px]">platform</Badge>
          <span className="text-xs text-muted-foreground">read-only</span>
          {commandHubUrl && (
            <a
              href={commandHubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline ml-auto"
            >
              View in Command Hub →
            </a>
          )}
        </div>
        <h2 className="text-xl font-semibold">{doc.title}</h2>
        <p className="text-xs text-muted-foreground mt-1 break-all">{doc.path}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.tags?.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      </div>
      <ScrollArea className="h-[55vh] rounded-md border p-4 bg-muted/30">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {doc.content}
        </pre>
      </ScrollArea>
      <p className="text-xs text-muted-foreground">
        {doc.word_count ?? 0} words · updated {new Date(doc.updated_at).toLocaleString()}
      </p>
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

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!query.data)
    return <p className="text-sm text-destructive">Document not found.</p>;

  const doc = query.data;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Document deleted");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  async function handleReindex() {
    try {
      await reindexMutation.mutateAsync(id);
      toast.success("Reindex triggered");
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

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={scope === "baseline" ? "secondary" : "default"} className="text-[10px]">
            {scope}
          </Badge>
          <AdminStatusBadge variant={statusVariant as any}>{doc.status}</AdminStatusBadge>
        </div>
        <h2 className="text-xl font-semibold">{doc.title}</h2>
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.topics?.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[50vh] rounded-md border p-4 bg-muted/30">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {doc.body || "(no body)"}
        </pre>
      </ScrollArea>

      <div className="flex items-center gap-2">
        {scope === "tenant" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReindex}
              disabled={reindexMutation.isPending}
            >
              Reindex
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive"
            >
              Delete
            </Button>
          </>
        ) : (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={doc.is_opted_out}
              onCheckedChange={(v) => handleOptout(!!v)}
              disabled={optoutMutation.isPending}
            />
            Opt out of this baseline doc for my tenant
          </label>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          updated {new Date(doc.updated_at).toLocaleString()}
        </span>
      </div>
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
      toast.success("Document created");
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
          Upload goes to <span className="font-medium">Your Tenant Docs</span>.
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Document body…"
          rows={4}
        />
        <Input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="Topics (comma-separated)"
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
