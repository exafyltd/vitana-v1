import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ExternalLink, Plus } from "lucide-react";
import { useVaeaCatalog, type VaeaCatalogItem } from "@/hooks/useVaea";
import { t } from '@/lib/i18n-toast';

const TIER_BADGE: Record<VaeaCatalogItem["tier"], string> = {
  own: "bg-emerald-100 text-emerald-800",
  vetted_partner: "bg-sky-100 text-sky-800",
  affiliate_network: "bg-amber-100 text-amber-800",
};

export function VaeaCatalogPanel() {
  const { items, loading, error, reload, create, remove } = useVaeaCatalog();
  const [showForm, setShowForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>{t('screens.business.retry')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">{t('screens.business.yourReferralCatalog')}</h3>
          <p className="text-xs text-muted-foreground">{t('screens.business.ownProductsRankAboveVettedPartners')}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Close" : "Add item"}
        </Button>
      </div>

      {showForm && (
        <AddCatalogForm
          onSubmit={async (payload) => { await create(payload); setShowForm(false); }}
        />
      )}

      {items.length === 0 && !showForm ? (
        <Card className="bg-white/50 backdrop-blur-sm border-white/20 border-dashed">
          <CardContent className="py-8 text-center space-y-1">
            <div className="font-medium">{t('screens.business.yourCatalogEmpty')}</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('screens.business.addProductsServicesAutopilotCanRecommend')}
            </p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="bg-white/70 backdrop-blur-sm border-white/20">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={TIER_BADGE[item.tier]}>{item.tier.replace("_", " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    {item.commission_percent != null && (
                      <Badge variant="secondary" className="text-xs">{item.commission_percent}%</Badge>
                    )}
                  </div>
                  <div className="font-medium">{item.title}</div>
                  {item.personal_note && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{t('screens.business.ldquoPersonal_noteRdquo', { personal_note: item.personal_note })}</p>
                  )}
                  <a
                    href={item.affiliate_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
                  >
                    {item.affiliate_url.length > 60 ? item.affiliate_url.slice(0, 60) + "…" : item.affiliate_url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setRemovingId(item.id);
                    try { await remove(item.id); } finally { setRemovingId(null); }
                  }}
                  disabled={removingId === item.id}
                >
                  {removingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">{t('screens.business.tier')}</span>
            <select
              className="w-full h-11 rounded-md border px-3 text-sm bg-background"
              value={tier}
              onChange={(e) => setTier(e.target.value as VaeaCatalogItem["tier"])}
            >
              <option value="own">{t('screens.business.ownMyProductservice')}</option>
              <option value="vetted_partner">{t('screens.business.vettedPartner')}</option>
              <option value="affiliate_network">{t('screens.business.affiliateNetwork')}</option>
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">{t('screens.business.category')}</span>
            <Input className="h-11" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('screens.business.eGSupplementCoaching')} />
          </label>
        </div>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">{t('screens.business.title')}</span>
          <Input className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('screens.business.whatYouReRecommending')} />
        </label>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">{t('screens.business.affiliateProductUrl')}</span>
          <Input className="h-11" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('screens.business.https')} />
        </label>
        <label className="text-xs space-y-1 block">
          <span className="text-muted-foreground">{t('screens.business.personalNoteOptional')}</span>
          <Input className="h-11" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('screens.business.whyYouTrustIt')} />
        </label>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end">
          <Button
            className="h-11 px-5 w-full md:w-auto"
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
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{t('screens.business.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
