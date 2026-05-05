/**
 * E5 (now cross-user enabled) — self-fetching wrapper that loads
 * partner_preferences via the gateway and renders the section.
 *
 * - Owner: fetches own data via /profiles/me/prefs (no filter).
 * - Non-owner: fetches the SUBJECT's data via /profiles/:vitana_id/prefs,
 *   which the gateway already filters server-side per the subject's
 *   account_visibility map and the viewer's relationship.
 *
 * The section component still applies its own visibility logic for sub-
 * field defaults; the server is the gate, the client is the pretty
 * printer.
 */

import { useEffect, useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/context/AuthProvider";
import {
  getProfilePrefs,
  getProfilePrefsByVitanaId,
  type PartnerPreferences,
  type ViewerRelationship,
} from "@/lib/profilePrefsApi";
import type { AccountVisibility } from "@/types/profile";
import { PartnerPreferencesSection } from "./PartnerPreferencesSection";
import { notifyError } from '@/lib/i18n-toast';

interface PartnerPreferencesPublicSectionProps {
  userId: string;       // subject's user_id (used to detect owner)
  vitanaId?: string;    // subject's vitana_id (required for non-owner fetch)
}

export function PartnerPreferencesPublicSection({ userId, vitanaId }: PartnerPreferencesPublicSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<PartnerPreferences | null>(null);
  const [vis, setVis] = useState<AccountVisibility | null>(null);
  const [relationship, setRelationship] = useState<ViewerRelationship>("self");

  const isOwner = !!user?.id && user.id === userId;

  useEffect(() => {
    if (isOwner) {
      getProfilePrefs()
        .then(({ partner_preferences, account_visibility }) => {
          setPrefs(partner_preferences);
          setVis(account_visibility as AccountVisibility);
          setRelationship("self");
        })
        .catch((e) =>
          notifyError('toasts.profile.couldNotLoadPartnerPreferences')
        );
      return;
    }
    if (!vitanaId) {
      setPrefs(null);
      setVis(null);
      return;
    }
    getProfilePrefsByVitanaId(vitanaId)
      .then(({ partner_preferences, relationship: rel }) => {
        setPrefs(partner_preferences);
        setVis(null); // server already filtered; sub-fields render as-is.
        setRelationship(rel);
      })
      .catch(() => {
        // 404 / 403 / private → render nothing. Don't toast a non-owner
        // for lack of permission to view.
        setPrefs(null);
      });
  }, [isOwner, vitanaId, toast]);

  if (!prefs || Object.keys(prefs).length === 0) return null;

  return (
    <PartnerPreferencesSection
      prefs={prefs}
      visibility={vis}
      viewerRelationship={relationship}
    />
  );
}
