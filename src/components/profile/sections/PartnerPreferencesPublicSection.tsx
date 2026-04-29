/**
 * E2 — self-fetching wrapper that loads partner_preferences via the
 * gateway and renders PartnerPreferencesSection.
 *
 * For now this only renders for the OWNER. Server-side enforcement of
 * cross-user visibility lives in a follow-up E5 PR; until that ships,
 * non-owners see nothing (privacy-safe default).
 *
 * Once E5 server-side filter wiring lands, switch to a public read
 * endpoint that returns a visibility-filtered view of any user's prefs.
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import {
  getProfilePrefs,
  type PartnerPreferences,
} from "@/lib/profilePrefsApi";
import type { AccountVisibility } from "@/types/profile";
import { PartnerPreferencesSection } from "./PartnerPreferencesSection";

interface PartnerPreferencesPublicSectionProps {
  userId: string; // subject's user_id
}

export function PartnerPreferencesPublicSection({ userId }: PartnerPreferencesPublicSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<PartnerPreferences | null>(null);
  const [vis, setVis] = useState<AccountVisibility | null>(null);

  const isOwner = !!user?.id && user.id === userId;

  useEffect(() => {
    // Owner-only fetch via /profiles/me/prefs (returns the caller's own
    // prefs). Non-owner cross-user reads land when E5 server-side filter
    // wiring ships.
    if (!isOwner) {
      setPrefs(null);
      setVis(null);
      return;
    }
    getProfilePrefs()
      .then(({ partner_preferences, account_visibility }) => {
        setPrefs(partner_preferences);
        setVis(account_visibility as AccountVisibility);
      })
      .catch((e) => {
        toast({
          title: "Could not load partner preferences",
          description: e?.message ?? "",
          variant: "destructive",
        });
      });
  }, [isOwner, toast]);

  if (!isOwner) return null;

  return (
    <PartnerPreferencesSection
      prefs={prefs}
      visibility={vis}
      viewerRelationship="self"
    />
  );
}
