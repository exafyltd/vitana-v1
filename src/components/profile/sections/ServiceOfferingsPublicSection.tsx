/**
 * E5 (now cross-user enabled) — self-fetching wrapper for
 * ServiceOfferingsSection.
 *
 * - Owner: fetches own data via /profiles/me/prefs.
 * - Non-owner: fetches via /profiles/:vitana_id/prefs which the server
 *   filters per the subject's account_visibility map. Default is public,
 *   so most rows render normally; priceRange may be redacted per-row.
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import {
  getProfilePrefs,
  getProfilePrefsByVitanaId,
  type ServiceOffering,
  type ViewerRelationship,
} from "@/lib/profilePrefsApi";
import type { AccountVisibility } from "@/types/profile";
import { ServiceOfferingsSection } from "./ServiceOfferingsSection";

interface Props {
  userId: string;
  vitanaId?: string;
}

export function ServiceOfferingsPublicSection({ userId, vitanaId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<ServiceOffering[] | null>(null);
  const [vis, setVis] = useState<AccountVisibility | null>(null);
  const [relationship, setRelationship] = useState<ViewerRelationship>("self");

  const isOwner = !!user?.id && user.id === userId;

  useEffect(() => {
    if (isOwner) {
      getProfilePrefs()
        .then(({ service_offerings, account_visibility }) => {
          setOffers(Array.isArray(service_offerings.offers) ? service_offerings.offers : []);
          setVis(account_visibility as AccountVisibility);
          setRelationship("self");
        })
        .catch((e) =>
          toast({ title: "Could not load offerings", description: e?.message ?? "", variant: "destructive" })
        );
      return;
    }
    if (!vitanaId) {
      setOffers(null);
      setVis(null);
      return;
    }
    getProfilePrefsByVitanaId(vitanaId)
      .then(({ service_offerings, relationship: rel }) => {
        setOffers(Array.isArray(service_offerings.offers) ? service_offerings.offers : []);
        setVis(null);
        setRelationship(rel);
      })
      .catch(() => {
        setOffers(null);
      });
  }, [isOwner, vitanaId, toast]);

  if (!offers || offers.length === 0) return null;

  return (
    <ServiceOfferingsSection
      offers={offers}
      visibility={vis}
      viewerRelationship={relationship}
    />
  );
}
