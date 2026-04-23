/**
 * Knowledge > System KB tab — exafy_admin-only view of the system-wide
 * knowledge_docs table (where the Book of the Vitana Index and other
 * vitana_system docs live).
 */

import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemKbDocs, useSystemKbDoc } from "@/hooks/useAdminSystemKb";

const PATH_PREFIXES: Array<{ key: string; label: string; prefix: string }> = [
  { key: "index-book", label: "Book of the Vitana Index", prefix: "kb/vitana-system/index-book/" },
  { key: "vitana-system", label: "All vitana_system docs", prefix: "kb/vitana-system/" },
  { key: "all", label: "All system KB docs", prefix: "" },
];

export default function KnowledgeSystemKB() {
  const [filterKey, setFilterKey] = useState("index-book");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeFilter = PATH_PREFIXES.find((f) => f.key === filterKey) ?? PATH_PREFIXES[0];

  const docsQuery = useSystemKbDocs({
    path_prefix: activeFilter.prefix || undefined,
    q: q.trim() || undefined,
  });
  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const docQuery = useSystemKbDoc(selectedId);
  const doc = docQuery.data;

  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📖"
          title="System KB"
          description="Exafy-admin-only: the system-wide knowledge_docs table that grounds the Vitana Assistant (retrieval-router priority 100). Contains the Book of the Vitana Index and other vitana_system documentation. Separate from tenant-scoped Documents."
        />

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PATH_PREFIXES.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filterKey === f.key ? "default" : "outline"}
                  onClick={() => setFilterKey(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or path…"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: doc list */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              {docsQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {!docsQuery.isLoading && docs.length === 0 && (
                <AdminEmptyState
                  title="No docs"
                  description={q ? `No results for "${q}"` : "No docs match this filter."}
                />
              )}
              {docs.length > 0 && (
                <ScrollArea className="h-[60vh]">
                  <ul className="space-y-1">
                    {docs.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(d.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                            selectedId === d.id
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="font-medium">{d.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 break-all">
                            {d.path}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {d.tags?.slice(0, 4).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Right: doc viewer */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              {!selectedId && (
                <AdminEmptyState
                  title="Pick a doc"
                  description="Select a document from the list to read its content."
                />
              )}
              {selectedId && docQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {doc && (
                <div className="space-y-4">
                  <div>
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
                  <ScrollArea className="h-[60vh] rounded-md border p-4 bg-muted/30">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {doc.content}
                    </pre>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {doc.word_count ?? 0} words · updated{" "}
                    {new Date(doc.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
