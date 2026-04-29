/**
 * E2 — self-fetching wrapper for ServiceOfferingsSection.
 *
 * Default visibility for service_offerings is 'public' so this DOES
 * render for non-owners (unlike PartnerPreferences). Cross-user reads
 * still work today via /profiles/me/prefs because the column is
 * publicly readable on profiles via Supabase RLS for authenticated
 * users — but until the cross-user gateway endpoint lands, owners see
 * full data and non-owners see nothing.
 *
 * Once E5 server-side filter wiring ships, this will fan out to a
 * cross-user endpoint that returns visibility-filtered offers for any
 * subject.
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import {
  getProfilePrefs,
  type ServiceOffering,
} from "@/lib/profilePrefsApi";
import type { AccountVisibility } from "@/types/profile";
import { ServiceOfferingsSection } from "./ServiceOfferingsSection";

interface Props {
  userId: string;
}

export function ServiceOfferingsPublicSection({ userId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<ServiceOffering[] | null>(null);
  const [vis, setVis] = useState<AccountVisibility | null>(null);

  const isOwner = !!user?.id && user.id === userId;

  useEffect(() => {
    if (!isOwner) {
      setOffers(null);
      setVis(null);
      return;
    }
    getProfilePrefs()
      .then(({ service_offerings, account_visibility }) => {
        setOffers(Array.isArray(service_offerings.offers) ? service_offerings.offers : []);
        setVis(account_visibility as AccountVisibility);
      })
      .catch((e) => {
        toast({
          title: "Could not load offerings",
          description: e?.message ?? "",
          variant: "destructive",
        });
      });
  }, [isOwner, toast]);

  if (!isOwner) return null;

  return (
    <ServiceOfferingsSection
      offers={offers}
      visibility={vis}
      viewerRelationship="self"
    />
  );
}
