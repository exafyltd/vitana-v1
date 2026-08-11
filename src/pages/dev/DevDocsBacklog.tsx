/**
 * /dev/docs/backlog (R7 from Phase 3b plan).
 *
 * In-app markdown viewer for spec/decision/catalog docs. Renders a curated
 * list so a developer working in Command Hub can read rationale without
 * jumping to GitHub.
 *
 * Source files split:
 *   - vitana-v1 docs: bundled at build time via Vite glob
 *   - vitana-platform specs: fetched from gateway /api/v1/docs/specs/:filename (R8)
 *
 * No editing affordance — edits happen via PRs to the source repo.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, FileText } from 'lucide-react';

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? '';

type Source = 'vitana-v1' | 'vitana-platform';

interface DocEntry {
  title: string;
  source: Source;
  /** For vitana-v1: bundle path. For vitana-platform: filename only. */
  path: string;
  description?: string;
}

const DOCS: readonly DocEntry[] = [
  {
    title: 'Release backlog — frontend spec',
    source: 'vitana-v1',
    path: '/docs/release-backlog-overview-screen.md',
    description: 'How /admin/releases (3 tabs) + /dev/releases + /dev/docs/backlog work in this app.',
  },
  {
    title: 'Release backlog — platform spec',
    source: 'vitana-platform',
    path: 'release-backlog-overview.md',
    description: 'Canonical: data model, gateway API, OASIS events, RBAC.',
  },
  {
    title: 'Release backlog — spec decisions (P1–P5 + F1)',
    source: 'vitana-platform',
    path: 'release-backlog-spec-decisions.md',
    description: 'VTID linkage, SDK pinning, channel promotion, public changelog, App Store/Play push, admin nav.',
  },
  {
    title: 'Feature catalog by role',
    source: 'vitana-v1',
    path: '/docs/feature-catalog-by-role.md',
    description: 'Inventory of every route grouped by Community / Patient / Professional / Staff / Admin / Developer.',
  },
  {
    title: 'Role cleanup decisions (Q1–Q7)',
    source: 'vitana-v1',
    path: '/docs/role-cleanup-decisions.md',
    description: 'Canonical 6-role model, security gaps, code-hygiene fixes.',
  },
] as const;

// Bundle vitana-v1/docs/*.md at build time. Vite reads them as raw strings.
const V1_DOCS = (import.meta as any).glob?.('/docs/*.md', { as: 'raw', eager: true }) as
  | Record<string, string>
  | undefined;

async function fetchDoc(entry: DocEntry): Promise<string> {
  if (entry.source === 'vitana-v1') {
    const content = V1_DOCS?.[entry.path];
    if (!content) {
      throw new Error(
        `Doc not bundled: ${entry.path}. Confirm Vite glob includes /docs/*.md and rebuild.`
      );
    }
    return content;
  }

  // vitana-platform: fetch via gateway proxy (R8)
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(
    `${GATEWAY_URL}/api/v1/docs/specs/${encodeURIComponent(entry.path)}`,
    { headers, credentials: 'include' }
  );
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Failed to fetch ${entry.path}: ${r.status} ${body.slice(0, 200)}`);
  }
  return await r.text();
}

/**
 * Minimal markdown rendering. Uses GitHub-flavored basics so we don't add a
 * dependency just for this viewer. The team can swap in a richer renderer
 * (react-markdown + remark-gfm) later if needed.
 */
function MarkdownContent({ text }: { text: string }) {
  // For now, render as preformatted text with headers + code blocks called out.
  // This is intentionally conservative — markdown lib swap is a separate change.
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed p-4 bg-muted/40 rounded">
      {text}
    </pre>
  );
}

export default function DevDocsBacklog() {
  const [selected, setSelected] = useState<DocEntry>(DOCS[0]);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    fetchDoc(selected)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 h-full">
      {/* Sidebar list */}
      <div className="md:w-80 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-3">Backlog &amp; Spec Docs</h2>
        <div className="space-y-2">
          {DOCS.map((doc) => (
            <button
              key={doc.path + doc.source}
              onClick={() => setSelected(doc)}
              className={
                'w-full text-left px-3 py-2 rounded-md transition border ' +
                (selected === doc
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50')
              }
            >
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{doc.title}</div>
                  {doc.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {doc.description}
                    </div>
                  )}
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {doc.source}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content viewer */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selected.title}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {selected.source}: {selected.path}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={
                    selected.source === 'vitana-v1'
                      ? `https://github.com/exafyltd/vitana-v1/blob/main${selected.path}`
                      : `https://github.com/exafyltd/vitana-platform/blob/main/specs/${selected.path}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
            <div className="p-4">
              {loading && <Skeleton className="h-96 w-full" />}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {content && <MarkdownContent text={content} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
