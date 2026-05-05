/**
 * VTID-DANCE-D5: Dance preferences drawer.
 *
 * Stable preferences that feed the matcher as a +bias on every dance intent
 * (the gateway intent-dance-helper reads profile.dance_preferences and
 * back-fills missing fields).
 *
 * Persists JSONB into profiles.dance_preferences:
 *   { varieties: [string], levels: { [variety]: level }, roles: [string],
 *     looking_for: [string], radius_km: number, venue_prefs: [string] }
 */

import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";
import { notifyError } from '@/lib/i18n-toast';

const VARIETIES = [
  { key: "salsa", label: "Salsa" },
  { key: "tango", label: "Tango" },
  { key: "bachata", label: "Bachata" },
  { key: "kizomba", label: "Kizomba" },
  { key: "swing", label: "Swing" },
  { key: "ballroom", label: "Ballroom" },
  { key: "hiphop", label: "Hip-hop" },
  { key: "contemporary", label: "Contemporary" },
] as const;

const LEVELS = ["beginner", "social", "intermediate", "advanced", "professional"] as const;
const ROLES = [
  { key: "lead", label: "Lead" },
  { key: "follow", label: "Follow" },
  { key: "either", label: "Either" },
] as const;
const LOOKING_FOR = [
  { key: "partner", label: "Partner" },
  { key: "teacher", label: "Teacher" },
  { key: "student", label: "Student" },
  { key: "group", label: "Group" },
  { key: "casual", label: "Casual go-out" },
  { key: "practice", label: "Practice" },
  { key: "performance", label: "Performance" },
] as const;
const VENUES = [
  { key: "studio", label: "Studio" },
  { key: "club", label: "Club" },
  { key: "outdoor", label: "Outdoor" },
  { key: "online", label: "Online" },
  { key: "home", label: "Home" },
] as const;

interface DancePreferences {
  varieties?: string[];
  levels?: Record<string, string>;
  roles?: string[];
  looking_for?: string[];
  radius_km?: number;
  venue_prefs?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DancePreferencesDrawer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const { toast } = useToast();

  const [varieties, setVarieties] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [lookingFor, setLookingFor] = useState<Set<string>>(new Set());
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [venuePrefs, setVenuePrefs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing prefs when opening.
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("dance_preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const prefs: DancePreferences = ((data as any)?.dance_preferences as DancePreferences) || {};
      setVarieties(new Set(prefs.varieties || []));
      setLevels(prefs.levels || {});
      setRoles(new Set(prefs.roles || []));
      setLookingFor(new Set(prefs.looking_for || []));
      setRadiusKm(typeof prefs.radius_km === "number" ? prefs.radius_km : 25);
      setVenuePrefs(new Set(prefs.venue_prefs || []));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const toggleSet = (s: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(s);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  // When a variety is unselected, remove its level entry.
  const setVarietyOn = (key: string) => {
    const next = new Set(varieties);
    if (next.has(key)) {
      next.delete(key);
      const newLevels = { ...levels };
      delete newLevels[key];
      setLevels(newLevels);
    } else {
      next.add(key);
      setLevels({ ...levels, [key]: levels[key] || "beginner" });
    }
    setVarieties(next);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload: DancePreferences = {
      varieties: Array.from(varieties),
      levels,
      roles: Array.from(roles),
      looking_for: Array.from(lookingFor),
      radius_km: radiusKm,
      venue_prefs: Array.from(venuePrefs),
    };
    const { error } = await supabase
      .from("profiles")
      .update({ dance_preferences: payload as any })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      notifyError('toasts.profile.couldNotSavePreferences');
      return;
    }
    toast({
      title: "Dance preferences saved",
      description:
        varieties.size > 0
          ? `Vitana will use these to find matches when you post a dance request.`
          : "You can set your preferred styles any time to improve matches.",
    });
    refreshProfile();
    onOpenChange(false);
  };

  const summaryLine = useMemo(() => {
    if (varieties.size === 0) return "Tell Vitana what you dance — improves matches across all dance posts.";
    const tops = Array.from(varieties).slice(0, 3).join(", ");
    return `Active: ${tops}${varieties.size > 3 ? `, +${varieties.size - 3}` : ""}`;
  }, [varieties]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>My dance preferences</DrawerTitle>
          <DrawerDescription>{summaryLine}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Varieties + level per variety */}
              <div className="space-y-3">
                <Label>Styles I dance</Label>
                <div className="flex flex-wrap gap-2">
                  {VARIETIES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVarietyOn(v.key)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        varieties.has(v.key)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {varieties.size > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      My level per style
                    </p>
                    {Array.from(varieties).map((v) => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="text-sm w-24 capitalize">{v}</span>
                        <div className="flex flex-wrap gap-1">
                          {LEVELS.map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setLevels({ ...levels, [v]: l })}
                              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                levels[v] === l
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Role I dance</Label>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => toggleSet(roles, r.key, setRoles)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        roles.has(r.key)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Looking for */}
              <div className="space-y-2">
                <Label>Looking for</Label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => toggleSet(lookingFor, l.key, setLookingFor)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        lookingFor.has(l.key)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel willingness */}
              <div className="space-y-2">
                <Label>Travel willingness</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[radiusKm]}
                    min={1}
                    max={250}
                    step={1}
                    onValueChange={(v) => setRadiusKm(v[0] ?? 25)}
                    className="flex-1"
                  />
                  <span className="text-sm w-16 text-right">{radiusKm} km</span>
                </div>
              </div>

              {/* Venue prefs */}
              <div className="space-y-2">
                <Label>Where I like to dance</Label>
                <div className="flex flex-wrap gap-2">
                  {VENUES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => toggleSet(venuePrefs, v.key, setVenuePrefs)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        venuePrefs.has(v.key)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
