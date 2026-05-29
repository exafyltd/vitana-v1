/**
 * VTID-02000: Preferences & Limitations page.
 *
 * Where users edit the non-negotiable filters that shape the Discover
 * marketplace for them. Seven sections: allergies, dietary, medications,
 * pregnancy, budget, religious/cultural, accessibility.
 *
 * Live counter: "currently filters X products from your feed" — powered by
 * GET /api/v1/user/limitations/impact.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { settingsNavigation } from "@/config/navigation";
import { ShieldCheck, AlertTriangle, Utensils, Pill, Baby, Wallet, Accessibility, Loader2 } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { fmtDate, fmtDateTime, fmtNumber } from '@/lib/locale-format';
const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_GATEWAY_BASE || "").replace(/\/+$/, "");

interface Limitations {
  allergies: string[];
  dietary_restrictions: string[];
  contraindications: string[];
  current_medications: string[];
  pregnancy_status: string | null;
  age_bracket: string | null;
  religious_restrictions: string[];
  ingredient_sensitivities: string[];
  physical_accessibility_needs: string[];
  budget_max_per_product_cents: number | null;
  budget_monthly_cap_cents: number | null;
  budget_preferred_band: string | null;
}

interface ImpactResponse {
  ok: boolean;
  total_active_products?: number;
  hidden_breakdown?: Record<string, number>;
  hidden_total_approx?: number;
}

const EMPTY: Limitations = {
  allergies: [],
  dietary_restrictions: [],
  contraindications: [],
  current_medications: [],
  pregnancy_status: null,
  age_bracket: null,
  religious_restrictions: [],
  ingredient_sensitivities: [],
  physical_accessibility_needs: [],
  budget_max_per_product_cents: null,
  budget_monthly_cap_cents: null,
  budget_preferred_band: null,
};

const DIETARY_OPTIONS = ["vegan", "vegetarian", "halal", "kosher", "gluten-free", "dairy-free", "nut-free", "soy-free", "sugar-free", "organic"];

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function TagEditor({
  label,
  icon: Icon,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="cursor-pointer" onClick={() => remove(v)}>{t('screens.settings.vNbsp', { v })}
          </Badge>
        ))}
        {values.length === 0 && <span className="text-xs text-muted-foreground">{t('screens.settings.noneAddedYet')}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="max-w-sm"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!input.trim()}>
          {t('screens.settings.add')}
        </Button>
      </div>
    </div>
  );
}

function DietaryPicker({ values, onChange }: { values: string[]; onChange: (next: string[]) => void }) {
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {DIETARY_OPTIONS.map((v) => (
        <Badge
          key={v}
          variant={values.includes(v) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => toggle(v)}
        >
          {v}
        </Badge>
      ))}
    </div>
  );
}

export default function Limitations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Limitations>(EMPTY);
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [lastVerified, setLastVerified] = useState<Record<string, string>>({});

  async function loadAll() {
    if (!GATEWAY_URL) {
      notifyError('toasts.settings.gatewayUrlNotConfigured');
      setLoading(false);
      return;
    }
    try {
      const headers = await authHeaders();
      const [limResp, impactResp] = await Promise.all([
        fetch(`${GATEWAY_URL}/api/v1/user/limitations`, { headers }),
        fetch(`${GATEWAY_URL}/api/v1/user/limitations/impact`, { headers }),
      ]);
      if (!limResp.ok) throw new Error(`Load failed: ${limResp.status}`);
      const limJson = await limResp.json();
      if (limJson?.limitations) {
        const lim = limJson.limitations;
        setState({
          allergies: lim.allergies ?? [],
          dietary_restrictions: lim.dietary_restrictions ?? [],
          contraindications: lim.contraindications ?? [],
          current_medications: lim.current_medications ?? [],
          pregnancy_status: lim.pregnancy_status,
          age_bracket: lim.age_bracket,
          religious_restrictions: lim.religious_restrictions ?? [],
          ingredient_sensitivities: lim.ingredient_sensitivities ?? [],
          physical_accessibility_needs: lim.physical_accessibility_needs ?? [],
          budget_max_per_product_cents: lim.budget_max_per_product_cents,
          budget_monthly_cap_cents: lim.budget_monthly_cap_cents,
          budget_preferred_band: lim.budget_preferred_band,
        });
        setLastVerified(lim.field_last_verified ?? {});
      }
      if (impactResp.ok) {
        setImpact(await impactResp.json());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError('toasts.settings.couldNotLoadLimitations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function save(partial: Partial<Limitations>) {
    if (!GATEWAY_URL) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/user/limitations`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(partial),
      });
      if (!resp.ok) throw new Error(`Save failed: ${resp.status}`);
      notify('toasts.settings.saved');
      // Refresh impact counter
      const impactResp = await fetch(`${GATEWAY_URL}/api/v1/user/limitations/impact`, { headers });
      if (impactResp.ok) setImpact(await impactResp.json());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError('toasts.settings.saveFailed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <SubNavigation items={settingsNavigation} />
        <div className="p-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('screens.settings.loadingYourPreferences')}
        </div>
      </AppLayout>
    );
  }

  const hiddenTotal = impact?.hidden_total_approx ?? 0;
  const totalProducts = impact?.total_active_products ?? 0;

  return (
    <AppLayout>
      <SEO title={t('screens.settings.limitationsVitana')} description="Edit the non-negotiable filters that shape your Discover marketplace." canonical={typeof window !== "undefined" ? window.location.href : ""} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.settings.preferencesLimitations')}
            description="These are the non-negotiable rules we apply to every product recommendation. Allergies, medical contraindications, and medication interactions are never overridable."
          />

          {/* Live counter */}
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{t('screens.settings.currentlyFilteredFromYourFeed')}</div>
                <div className="text-2xl font-semibold">
                  {fmtNumber(hiddenTotal)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t('screens.settings.value0ActiveProducts', { value0: fmtDateTime(totalProducts) })}
                  </span>
                </div>
              </div>
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                {t('screens.settings.allergies')}
                <span className="text-xs font-normal text-muted-foreground">{t('screens.settings.neverOverridable')}</span>
              </CardTitle>
              <CardDescription>{t('screens.settings.weWillNeverRecommendProductsContaining', { value0: " ", value1: lastVerified.allergies ? fmtDate(new Date(lastVerified.allergies)) : "never" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagEditor
                label="Allergens"
                icon={AlertTriangle}
                values={state.allergies}
                onChange={(next) => {
                  setState((s) => ({ ...s, allergies: next }));
                }}
                placeholder={t('screens.settings.eGPeanutsShellfishLatex')}
              />
              <Button className="mt-4" onClick={() => save({ allergies: state.allergies })} disabled={saving}>
                {t('screens.settings.saveAllergies')}
              </Button>
            </CardContent>
          </Card>

          {/* Dietary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                {t('screens.settings.dietaryRestrictions')}
              </CardTitle>
              <CardDescription>{t('screens.settings.preferencesWeApplyUnlessYouExplicitly')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DietaryPicker
                values={state.dietary_restrictions}
                onChange={(next) => setState((s) => ({ ...s, dietary_restrictions: next }))}
              />
              <Button onClick={() => save({ dietary_restrictions: state.dietary_restrictions })} disabled={saving}>
                {t('screens.settings.saveDietary')}
              </Button>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-600" />
                {t('screens.settings.currentMedications')}
                <span className="text-xs font-normal text-muted-foreground">{t('screens.settings.interactionChecksApply')}</span>
              </CardTitle>
              <CardDescription>{t('screens.settings.weUseThisAvoidRecommendingSupplements', { value0: " ", value1: lastVerified.current_medications ? fmtDate(new Date(lastVerified.current_medications)) : "never" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagEditor
                label="Medications (generic or class, e.g. SSRI, blood-thinner)"
                icon={Pill}
                values={state.current_medications}
                onChange={(next) => setState((s) => ({ ...s, current_medications: next }))}
                placeholder={t('screens.settings.eGSsriBloodthinnerStatin')}
              />
              <Button className="mt-4" onClick={() => save({ current_medications: state.current_medications })} disabled={saving}>
                {t('screens.settings.saveMedications')}
              </Button>
            </CardContent>
          </Card>

          {/* Pregnancy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-600" />
                {t('screens.settings.pregnancyNursing')}
              </CardTitle>
              <CardDescription>{t('screens.settings.someSupplementsContraindicatedDuringPregnancyNursi')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm space-y-2">
                <Label>{t('screens.settings.status')}</Label>
                <Select
                  value={state.pregnancy_status ?? "prefer_not_say"}
                  onValueChange={(v) => setState((s) => ({ ...s, pregnancy_status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_pregnant">{t('screens.settings.notPregnant')}</SelectItem>
                    <SelectItem value="pregnant">{t('screens.settings.pregnant')}</SelectItem>
                    <SelectItem value="nursing">{t('screens.settings.nursing')}</SelectItem>
                    <SelectItem value="prefer_not_say">{t('screens.settings.preferNotSay')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => save({ pregnancy_status: state.pregnancy_status as Limitations["pregnancy_status"] })} disabled={saving}>
                {t('screens.settings.savePregnancyStatus')}
              </Button>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                {t('screens.settings.budget')}
              </CardTitle>
              <CardDescription>{t('screens.settings.productsAboveYourPerproductCeilingHidden')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('screens.settings.maxPerProductEur')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={state.budget_max_per_product_cents !== null ? state.budget_max_per_product_cents / 100 : ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Math.round(Number(e.target.value) * 100);
                      setState((s) => ({ ...s, budget_max_per_product_cents: val }));
                    }}
                    placeholder="e.g. 40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('screens.settings.monthlyCapEurOptional')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={state.budget_monthly_cap_cents !== null ? state.budget_monthly_cap_cents / 100 : ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Math.round(Number(e.target.value) * 100);
                      setState((s) => ({ ...s, budget_monthly_cap_cents: val }));
                    }}
                    placeholder="e.g. 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('screens.settings.preferredPriceBand')}</Label>
                  <Select
                    value={state.budget_preferred_band ?? "any"}
                    onValueChange={(v) => setState((s) => ({ ...s, budget_preferred_band: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('screens.settings.any')}</SelectItem>
                      <SelectItem value="budget">{t('screens.settings.budgetfriendly')}</SelectItem>
                      <SelectItem value="mid">{t('screens.settings.midrange')}</SelectItem>
                      <SelectItem value="premium">{t('screens.settings.premium')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() =>
                  save({
                    budget_max_per_product_cents: state.budget_max_per_product_cents,
                    budget_monthly_cap_cents: state.budget_monthly_cap_cents,
                    budget_preferred_band: state.budget_preferred_band as Limitations["budget_preferred_band"],
                  })
                }
                disabled={saving}
              >{t('screens.settings.saveBudget')}
              </Button>
            </CardContent>
          </Card>

          {/* Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-sky-600" />
                {t('screens.settings.accessibility')}
              </CardTitle>
              <CardDescription>{t('screens.settings.preferencesForFormFactorUsability')}</CardDescription>
            </CardHeader>
            <CardContent>
              <TagEditor
                label="Accessibility needs"
                icon={Accessibility}
                values={state.physical_accessibility_needs}
                onChange={(next) => setState((s) => ({ ...s, physical_accessibility_needs: next }))}
                placeholder={t('screens.settings.eGLiquidformLargelabel')}
              />
              <Button className="mt-4" onClick={() => save({ physical_accessibility_needs: state.physical_accessibility_needs })} disabled={saving}>
                {t('screens.settings.saveAccessibility')}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center pt-4">{t('screens.settings.safetycriticalFieldsAllergiesMedicationsPregnancyR')}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
