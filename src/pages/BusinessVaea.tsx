import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Loader2, Trash2, ExternalLink, X, Plus } from "lucide-react";
import {
  useVaeaSummary,
  useVaeaConfig,
  useVaeaCatalog,
  useVaeaDetectedQuestions,
  useVaeaDrafts,
  type VaeaCatalogItem,
  type VaeaDraft,
  type VaeaDetectedQuestion,
} from "@/hooks/useVaea";

export default function BusinessVaea() {
  const summary = useVaeaSummary();

  return (
    <AppLayout>
      <SEO
        title="VAEA — Vitana Autonomous Economic Actor"
        description="Your community referral agent. Observe what it detects, curate what it recommends."
        canonical={window.location.href}
      />
      <div className="px-4 pt-4 pb-24 max-w-5xl mx-auto space-y-4">
        <StandardHeader
          title="VAEA"
          description="Your community referral agent — observe-mode"
        />

        <ConfigCard />

        <Card className="bg-white/70 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">At a glance</CardTitle>
            <CardDescription>Last 7 days of activity</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : summary.error ? (
              <p className="text-sm text-destructive">{summary.error}</p>
            ) : summary.data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Active channels" value={summary.data.counts.active_channels} />
                <Stat label="Catalog items" value={summary.data.counts.active_catalog_items} />
                <Stat label="Open drafts" value={summary.data.counts.open_drafts} />
                <Stat label="Questions (7d)" value={summary.data.counts.questions_last_7d} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <SplitBar defaultValue="drafts" className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="drafts">Drafts</SplitBarTrigger>
            <SplitBarTrigger value="detected">Detected</SplitBarTrigger>
            <SplitBarTrigger value="catalog">Catalog</SplitBarTrigger>
          </SplitBarList>
          <SplitBarContent value="drafts" className="pt-4">
            <DraftsSection />
          </SplitBarContent>
          <SplitBarContent value="detected" className="pt-4">
            <DetectedSection />
          </SplitBarContent>
          <SplitBarContent value="catalog" className="pt-4">
            <CatalogSection />
          </SplitBarContent>
        </SplitBar>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2 border border-white/30">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ConfigCard() {
  const { config, loading, error, update } = useVaeaConfig();
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: "receive_recommendations" | "give_recommendations" | "make_money_goal", value: boolean) => {
    setSaving(key);
    try {
      await update({ [key]: value });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-white/20">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="py-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const c = config;

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="text-base">Your three switches</CardTitle>
        <CardDescription>
          These decide what VAEA can do on your behalf. You can flip them any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow
          title="Receive recommendations"
          description="VAEA can query peers when you ask questions."
          checked={c?.receive_recommendations ?? true}
          onChange={(v) => toggle("receive_recommendations", v)}
          saving={saving === "receive_recommendations"}
        />
        <SwitchRow
          title="Give recommendations (earn)"
          description="Your VAEA may offer your catalog to other members. Off by default — opt in when you're ready."
          checked={c?.give_recommendations ?? false}
          onChange={(v) => toggle("give_recommendations", v)}
          saving={saving === "give_recommendations"}
        />
        <SwitchRow
          title="Goal: make money"
          description="Promotes earn from propose-and-approve to autonomous. Only flip this when you trust your catalog and disclosure."
          checked={c?.make_money_goal ?? false}
          onChange={(v) => toggle("make_money_goal", v)}
          saving={saving === "make_money_goal"}
          disabled={!c?.give_recommendations}
          disabledHint="Turn on 'Give recommendations' first."
        />
      </CardContent>
    </Card>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  saving,
  disabled,
  disabledHint,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  saving?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {disabled ? disabledHint || description : description}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled || saving} />
      </div>
    </div>
  );
}

function DraftsSection() {
  const { drafts, loading, error, dismiss, reload } = useVaeaDrafts(25);
  const [dismissing, setDismissing] = useState<string | null>(null);

  if (loading) return <SectionLoader />;
  if (error) return <SectionError message={error} onRetry={reload} />;

  if (drafts.length === 0) {
    return (
      <EmptyState
        title="No shadow drafts yet"
        body="When VAEA spots a question it thinks it can answer, the draft appears here. Nothing is posted — this is observe mode."
      />
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((d) => (
        <DraftCard
          key={d.id}
          draft={d}
          dismissing={dismissing === d.id}
          onDismiss={async () => {
            setDismissing(d.id);
            try { await dismiss(d.id); } finally { setDismissing(null); }
          }}
        />
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  dismissing,
  onDismiss,
}: {
  draft: VaeaDraft;
  dismissing: boolean;
  onDismiss: () => void | Promise<void>;
}) {
  const q = draft.vaea_detected_questions;
  const tierColor: Record<string, string> = {
    own: "bg-emerald-100 text-emerald-800",
    vetted_partner: "bg-sky-100 text-sky-800",
    affiliate_network: "bg-amber-100 text-amber-800",
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{draft.status}</Badge>
            {draft.match_tier && (
              <Badge className={tierColor[draft.match_tier] || "bg-muted"}>{draft.match_tier.replace("_", " ")}</Badge>
            )}
            {draft.match_score != null && (
              <Badge variant="secondary">score {draft.match_score.toFixed(2)}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onDismiss()}
            disabled={dismissing}
          >
            {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Dismiss</span>
          </Button>
        </div>

        {q?.message_body && (
          <div className="rounded-lg bg-muted/40 border p-3">
            <div className="text-xs text-muted-foreground mb-1">
              {q.platform || "?"}{q.author_handle ? ` · @${q.author_handle}` : ""}
            </div>
            <p className="text-sm">{q.message_body}</p>
            {q.message_url && (
              <a
                href={q.message_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-xs font-medium mb-1 text-muted-foreground">VAEA draft</div>
          <p className="text-sm whitespace-pre-wrap">{draft.reply_body}</p>
        </div>

        {draft.match_reason && (
          <p className="text-xs text-muted-foreground">Why: {draft.match_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DetectedSection() {
  const { questions, loading, error, reload } = useVaeaDetectedQuestions(50);

  if (loading) return <SectionLoader />;
  if (error) return <SectionError message={error} onRetry={reload} />;

  if (questions.length === 0) {
    return (
      <EmptyState
        title="Nothing detected yet"
        body="VAEA logs every message it scans — drafted or not — so you can audit what it's seeing."
      />
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <DetectedRow key={q.id} q={q} />
      ))}
    </div>
  );
}

function DetectedRow({ q }: { q: VaeaDetectedQuestion }) {
  return (
    <div className="rounded-lg border border-white/30 bg-white/50 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{q.platform}</span>
          {q.author_handle && <span>· @{q.author_handle}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">{q.disposition.replace("_", " ")}</Badge>
          <span className="text-xs font-mono">{q.combined_score.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-sm line-clamp-2">{q.message_body}</p>
      {q.extracted_topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {q.extracted_topics.slice(0, 6).map((t) => (
            <span key={t} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
      )}
      {q.disposition_reason && (
        <p className="text-[11px] text-muted-foreground mt-1 italic">{q.disposition_reason}</p>
      )}
    </div>
  );
}

function CatalogSection() {
  const { items, loading, error, reload, create, remove } = useVaeaCatalog();
  const [showForm, setShowForm] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  if (loading) return <SectionLoader />;
  if (error) return <SectionError message={error} onRetry={reload} />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Close" : "Add item"}
        </Button>
      </div>

      {showForm && <AddCatalogForm onSubmit={async (payload) => { await create(payload); setShowForm(false); }} />}

      {items.length === 0 && !showForm ? (
        <EmptyState
          title="Your catalog is empty"
          body="Add the products or services VAEA can recommend on your behalf. Your own goods rank above vetted partners, which rank above affiliate links."
        />
      ) : (
        items.map((item) => (
          <CatalogRow
            key={item.id}
            item={item}
            removing={removing === item.id}
            onRemove={async () => {
              setRemoving(item.id);
              try { await remove(item.id); } finally { setRemoving(null); }
            }}
          />
        ))
      )}
    </div>
  );
}

function CatalogRow({
  item,
  removing,
  onRemove,
}: {
  item: VaeaCatalogItem;
  removing: boolean;
  onRemove: () => void | Promise<void>;
}) {
  const tierColor: Record<string, string> = {
    own: "bg-emerald-100 text-emerald-800",
    vetted_partner: "bg-sky-100 text-sky-800",
    affiliate_network: "bg-amber-100 text-amber-800",
  };
  return (
    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={tierColor[item.tier]}>{item.tier.replace("_", " ")}</Badge>
              <Badge variant="outline" className="text-xs">{item.category}</Badge>
              {item.commission_percent != null && (
                <Badge variant="secondary" className="text-xs">{item.commission_percent}%</Badge>
              )}
            </div>
            <div className="font-medium">{item.title}</div>
            {item.personal_note && (
              <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{item.personal_note}&rdquo;</p>
            )}
            <a
              href={item.affiliate_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {item.affiliate_url.length > 60 ? item.affiliate_url.slice(0, 60) + "…" : item.affiliate_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void onRemove()} disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddCatalogForm({ onSubmit }: { onSubmit: (payload: Partial<VaeaCatalogItem>) => Promise<void> }) {
  const [tier, setTier] = useState<VaeaCatalogItem["tier"]>("affiliate_network");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Tier</span>
            <select
              className="w-full h-9 rounded-md border px-2 text-sm bg-background"
              value={tier}
              onChange={(e) => setTier(e.target.value as VaeaCatalogItem["tier"])}
            >
              <option value="own">Own — my product/service</option>
              <option value="vetted_partner">Vetted partner</option>
              <option value="affiliate_network">Affiliate network</option>
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Category</span>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. supplement, coaching" />
          </label>
        </div>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What you're recommending" />
        </label>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">Affiliate / product URL</span>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">Personal note (optional)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you trust it" />
        </label>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={busy || !title.trim() || !category.trim() || !url.trim()}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSubmit({ tier, title: title.trim(), category: category.trim(), affiliate_url: url.trim(), personal_note: note.trim() || null });
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionLoader() {
  return (
    <div className="py-12 flex justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="bg-destructive/10 border-destructive/20">
      <CardContent className="py-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="bg-white/50 backdrop-blur-sm border-white/20 border-dashed">
      <CardContent className="py-8 text-center space-y-1">
        <div className="font-medium">{title}</div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{body}</p>
      </CardContent>
    </Card>
  );
}
