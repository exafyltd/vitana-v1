/**
 * E2 — PartnerPreferencesDrawer.
 *
 * Editor for profiles.partner_preferences. Visibility on the public
 * profile page is gated separately via account_visibility.partnerPreferences
 * (default 'private'). This drawer is for the owner only.
 *
 * Schema mirrors services/gateway/src/routes/profile-prefs.ts sanitizer:
 *   gender_pref: 'female' | 'male' | 'any'
 *   age_range: [min, max] (1..120)
 *   max_radius_km: number (0..20000)
 *   location_label: string (≤200)
 *   relationship_intent: 'dating' | 'life_partner' | 'companionship' | 'open'
 *   must_haves: string[] (max 10, each ≤100)
 *   deal_breakers: string[] (max 10, each ≤100)
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  getProfilePrefs,
  patchPartnerPreferences,
  type PartnerPreferences,
  type GenderPref,
  type RelationshipIntent,
} from "@/lib/profilePrefsApi";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface PartnerPreferencesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (prefs: PartnerPreferences) => void;
}

const DEFAULT_AGE_RANGE: [number, number] = [25, 45];

export function PartnerPreferencesDrawer({ open, onOpenChange, onSaved }: PartnerPreferencesDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [genderPref, setGenderPref] = useState<GenderPref | "">("");
  const [ageRange, setAgeRange] = useState<[number, number]>(DEFAULT_AGE_RANGE);
  const [maxRadius, setMaxRadius] = useState<number>(50);
  const [location, setLocation] = useState("");
  const [intent, setIntent] = useState<RelationshipIntent | "">("");
  const [mustHavesText, setMustHavesText] = useState("");
  const [dealBreakersText, setDealBreakersText] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProfilePrefs()
      .then(({ partner_preferences: p }) => {
        setGenderPref((p.gender_pref as GenderPref) ?? "");
        setAgeRange(Array.isArray(p.age_range) && p.age_range.length === 2 ? p.age_range : DEFAULT_AGE_RANGE);
        setMaxRadius(typeof p.max_radius_km === "number" ? p.max_radius_km : 50);
        setLocation(p.location_label ?? "");
        setIntent((p.relationship_intent as RelationshipIntent) ?? "");
        setMustHavesText((p.must_haves ?? []).join(", "));
        setDealBreakersText((p.deal_breakers ?? []).join(", "));
      })
      .catch((e) => {
        notifyError('toasts.profile.couldNotLoadPreferences');
      })
      .finally(() => setLoading(false));
  }, [open, toast]);

  const splitList = (s: string): string[] =>
    s
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: PartnerPreferences = {};
      if (genderPref) payload.gender_pref = genderPref;
      payload.age_range = ageRange;
      payload.max_radius_km = maxRadius;
      if (location.trim()) payload.location_label = location.trim().slice(0, 200);
      if (intent) payload.relationship_intent = intent;
      const mh = splitList(mustHavesText);
      if (mh.length > 0) payload.must_haves = mh;
      const db = splitList(dealBreakersText);
      if (db.length > 0) payload.deal_breakers = db;

      const saved = await patchPartnerPreferences(payload);
      notify('toasts.profile.partnerPreferencesSaved');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      notifyError('toasts.profile.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.partnerPreferences')}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-2">
          <Lock className="h-3 w-3" />
          {t('screens.profile.privateByDefaultAdjustVisibilityPer')}
        </p>

        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{t('screens.profile.iMLookingFor')}</Label>
              <Select value={genderPref} onValueChange={(v) => setGenderPref(v as GenderPref)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.profile.choose')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">{t('screens.profile.women')}</SelectItem>
                  <SelectItem value="male">{t('screens.profile.men')}</SelectItem>
                  <SelectItem value="any">{t('screens.profile.anyone')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Age range — {ageRange[0]} to {ageRange[1]}</Label>
              <Slider
                min={18}
                max={90}
                step={1}
                value={ageRange}
                onValueChange={(v) => {
                  if (Array.isArray(v) && v.length === 2) setAgeRange([v[0], v[1]] as [number, number]);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('screens.profile.withinMaxradiusKm', { maxRadius })}</Label>
              <Slider
                min={0}
                max={500}
                step={5}
                value={[maxRadius]}
                onValueChange={(v) => setMaxRadius(v[0] ?? 50)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('screens.profile.where')}</Label>
              <Input
                id="location"
                placeholder={t('screens.profile.eGViennaAustria')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('screens.profile.whatIMLookingFor')}</Label>
              <Select value={intent} onValueChange={(v) => setIntent(v as RelationshipIntent)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.profile.choose')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dating">{t('screens.profile.dating')}</SelectItem>
                  <SelectItem value="life_partner">{t('screens.profile.lifePartner')}</SelectItem>
                  <SelectItem value="companionship">{t('screens.profile.companionship')}</SelectItem>
                  <SelectItem value="open">{t('screens.profile.open')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="must-haves">{t('screens.profile.musthavesCommaseparatedUp10')}</Label>
              <Textarea
                id="must-haves"
                placeholder={t('screens.profile.kindCuriousActiveOutdoors')}
                value={mustHavesText}
                onChange={(e) => setMustHavesText(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-breakers">{t('screens.profile.dealbreakersCommaseparatedUp10')}</Label>
              <Textarea
                id="deal-breakers"
                placeholder={t('screens.profile.smokerLongdistanceOnly')}
                value={dealBreakersText}
                onChange={(e) => setDealBreakersText(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t('screens.profile.cancel')}
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
