/**
 * E2 — client for profiles.partner_preferences + profiles.service_offerings.
 * Wraps the gateway PATCH endpoints introduced in VTID-02617.
 */

import { communityFetch } from "./community-gateway";

export type GenderPref = "female" | "male" | "any";
export type RelationshipIntent = "dating" | "life_partner" | "companionship" | "open";

export interface PartnerPreferences {
  gender_pref?: GenderPref;
  age_range?: [number, number];
  max_radius_km?: number;
  location_label?: string;
  relationship_intent?: RelationshipIntent;
  must_haves?: string[];
  deal_breakers?: string[];
}

export interface ServiceOffering {
  category: string;
  title: string;
  short_description?: string;
  price_min_cents?: number;
  price_max_cents?: number;
  currency?: string;
  contact_via?: "message" | "profile";
}

export interface ServiceOfferings {
  offers?: ServiceOffering[];
}

export interface ProfilePrefsResponse {
  partner_preferences: PartnerPreferences;
  service_offerings: ServiceOfferings;
  account_visibility: Record<string, "private" | "connections" | "public">;
}

export async function getProfilePrefs(): Promise<ProfilePrefsResponse> {
  const res = await communityFetch("/api/v1/profiles/me/prefs");
  if (!res.ok) throw new Error(`Get profile prefs failed (${res.status})`);
  const data = await res.json();
  return {
    partner_preferences: data.partner_preferences ?? {},
    service_offerings: data.service_offerings ?? {},
    account_visibility: data.account_visibility ?? {},
  };
}

export type ViewerRelationship = "self" | "connection" | "stranger";

export interface ProfilePrefsByVidResponse {
  vitana_id: string;
  relationship: ViewerRelationship;
  partner_preferences: PartnerPreferences;
  service_offerings: ServiceOfferings;
}

/**
 * E5 cross-user fetch — returns the SUBJECT's prefs filtered through
 * their account_visibility map and the viewer's relationship. Self gets
 * the full payload (same shape as /profiles/me/prefs).
 */
export async function getProfilePrefsByVitanaId(vid: string): Promise<ProfilePrefsByVidResponse> {
  const clean = vid.replace(/^@/, "").trim();
  const res = await communityFetch(`/api/v1/profiles/${encodeURIComponent(clean)}/prefs`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Get prefs failed (${res.status})`);
  }
  const data = await res.json();
  return {
    vitana_id: data.vitana_id ?? clean,
    relationship: (data.relationship as ViewerRelationship) ?? "stranger",
    partner_preferences: data.partner_preferences ?? {},
    service_offerings: data.service_offerings ?? {},
  };
}

export async function patchPartnerPreferences(
  prefs: PartnerPreferences
): Promise<PartnerPreferences> {
  const res = await communityFetch("/api/v1/profiles/me/partner-preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Update failed (${res.status})`);
  }
  const data = await res.json();
  return data.partner_preferences ?? {};
}

export async function patchServiceOfferings(
  offerings: ServiceOfferings
): Promise<ServiceOfferings> {
  const res = await communityFetch("/api/v1/profiles/me/service-offerings", {
    method: "PATCH",
    body: JSON.stringify(offerings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Update failed (${res.status})`);
  }
  const data = await res.json();
  return data.service_offerings ?? {};
}
