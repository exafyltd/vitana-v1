/**
 * E2 — ServiceOfferingsDrawer.
 *
 * Editor for profiles.service_offerings: a list of services the user
 * offers (categories, prices, descriptions). Default visibility is
 * public (the whole point is for others to find these).
 *
 * Schema mirrors services/gateway/src/routes/profile-prefs.ts sanitizer:
 *   { offers: [{
 *       category, title, short_description, price_min_cents,
 *       price_max_cents, currency, contact_via
 *     }] }
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  getProfilePrefs,
  patchServiceOfferings,
  type ServiceOffering,
} from "@/lib/profilePrefsApi";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ServiceOfferingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (offers: ServiceOffering[]) => void;
}

const EMPTY_OFFER: ServiceOffering = {
  category: "",
  title: "",
  short_description: "",
  price_min_cents: undefined,
  price_max_cents: undefined,
  currency: "EUR",
  contact_via: "message",
};

export function ServiceOfferingsDrawer({ open, onOpenChange, onSaved }: ServiceOfferingsDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState<ServiceOffering[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProfilePrefs()
      .then(({ service_offerings: s }) => {
        setOffers(Array.isArray(s.offers) ? s.offers : []);
      })
      .catch((e) => {
        notifyError('toasts.profile.couldNotLoadOfferings');
      })
      .finally(() => setLoading(false));
  }, [open, toast]);

  const updateOffer = (idx: number, patch: Partial<ServiceOffering>) => {
    setOffers((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const addOffer = () => {
    if (offers.length >= 20) return;
    setOffers((prev) => [...prev, { ...EMPTY_OFFER }]);
  };

  const removeOffer = (idx: number) => {
    setOffers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty offers (must have category + title at minimum).
      const cleanOffers = offers.filter((o) => o.category.trim() && o.title.trim());
      const saved = await patchServiceOfferings({ offers: cleanOffers });
      notify('toasts.profile.serviceOfferingsSaved');
      onSaved?.(saved.offers ?? []);
      onOpenChange(false);
    } catch (e: any) {
      notifyError('toasts.profile.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.serviceOfferings')}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Public by default — these show on your profile so others can find what you offer.
        </p>

        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {offers.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                No offerings yet. Add one to start.
              </div>
            )}

            {offers.map((o, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-3 relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1.5 right-1.5 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOffer(idx)}
                  aria-label="Remove offering"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`title-${idx}`} className="text-xs">Title</Label>
                    <Input
                      id={`title-${idx}`}
                      placeholder={t('screens.profile.eG1on1SalsaLesson')}
                      value={o.title}
                      onChange={(e) => updateOffer(idx, { title: e.target.value })}
                      maxLength={140}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`category-${idx}`} className="text-xs">Category</Label>
                    <Input
                      id={`category-${idx}`}
                      placeholder={t('screens.profile.eGDanceTeachingSalsa')}
                      value={o.category}
                      onChange={(e) => updateOffer(idx, { category: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`desc-${idx}`} className="text-xs">Description</Label>
                    <Textarea
                      id={`desc-${idx}`}
                      placeholder={t('screens.profile.whatSIncludedFormatEtc')}
                      value={o.short_description ?? ""}
                      onChange={(e) => updateOffer(idx, { short_description: e.target.value })}
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`pmin-${idx}`} className="text-xs">{t('screens.profile.priceMinCents')}</Label>
                    <Input
                      id={`pmin-${idx}`}
                      type="number"
                      min={0}
                      placeholder="2500"
                      value={o.price_min_cents ?? ""}
                      onChange={(e) => updateOffer(idx, { price_min_cents: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`pmax-${idx}`} className="text-xs">{t('screens.profile.priceMaxCents')}</Label>
                    <Input
                      id={`pmax-${idx}`}
                      type="number"
                      min={0}
                      placeholder="5000"
                      value={o.price_max_cents ?? ""}
                      onChange={(e) => updateOffer(idx, { price_max_cents: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`curr-${idx}`} className="text-xs">Currency</Label>
                    <Input
                      id={`curr-${idx}`}
                      value={o.currency ?? ""}
                      onChange={(e) => updateOffer(idx, { currency: e.target.value.toUpperCase().slice(0, 5) })}
                      placeholder="EUR"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('screens.profile.contactVia')}</Label>
                    <Select
                      value={o.contact_via ?? "message"}
                      onValueChange={(v) => updateOffer(idx, { contact_via: v as "message" | "profile" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="message">{t('screens.profile.directMessage')}</SelectItem>
                        <SelectItem value="profile">{t('screens.profile.profileLink')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addOffer} disabled={offers.length >= 20} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add offering {offers.length >= 20 ? "(max 20)" : ""}
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
