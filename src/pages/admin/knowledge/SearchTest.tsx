/**
 * Knowledge > Search Test tab
 *
 * Admin tool to test KB search. Type a question, see which documents
 * would be retrieved to answer it.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useKBSearch } from "@/hooks/useAdminKnowledge";

export default function KnowledgeSearchTest() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const searchQuery = useKBSearch(activeQuery);
  const results = searchQuery.data || [];

  function handleSearch() {
    setActiveQuery(query.trim());
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🔍"
          title="Search Test"
          description="Test your knowledge base configuration. Type a question to see which documents would be retrieved."
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Type a question to test KB retrieval..."
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={!query.trim() || searchQuery.isLoading}>
                {searchQuery.isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {activeQuery && !searchQuery.isLoading && results.length === 0 && (
          <AdminEmptyState
            title="No results"
            description={`No documents matched "${activeQuery}". Try a different query or add more documents.`}
          />
        )}

        {results.length > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-xs text-muted-foreground mb-2">
                {results.length} result{results.length !== 1 ? "s" : ""} for "{activeQuery}"
              </p>
              {results.map((r, i) => (
                <div key={r.id} className="flex items-start justify-between border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
                      <span className="text-sm font-medium truncate">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.topics?.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <AdminStatusBadge variant={r.source === "tenant" ? "active" : "info"}>
                      {r.source}
                    </AdminStatusBadge>
                    <AdminStatusBadge variant={r.rank === "high" ? "active" : "inactive"}>
                      {r.rank}
                    </AdminStatusBadge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
