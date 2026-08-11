/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE: client-side i18n labels for the seeded
 * category taxonomy (supabase/migrations/20260727090000_bootstrap_community_
 * marketplace.sql in vitana-platform). Categories are admin-editable there
 * and the API's display_label column is a single fixed English string, not
 * a translation catalog entry — so we map the known seed keys to real i18n
 * keys here and only fall back to the backend's display_label (untranslated)
 * for a category an admin adds later that isn't in this map yet.
 */

import { t } from "@/lib/i18n-toast";
import type { CommunityListingCategory } from "@/hooks/useCommunityMarketplace";

const CATEGORY_I18N_KEYS: Record<string, string> = {
  electronics: "screens.communityMarketplace.category_electronics",
  home_furniture: "screens.communityMarketplace.category_homeFurniture",
  fashion_apparel: "screens.communityMarketplace.category_fashionApparel",
  books_media: "screens.communityMarketplace.category_booksMedia",
  sports_outdoors: "screens.communityMarketplace.category_sportsOutdoors",
  kids_baby: "screens.communityMarketplace.category_kidsBaby",
  other_items: "screens.communityMarketplace.category_otherItems",
  home_services: "screens.communityMarketplace.category_homeServices",
  tutoring_coaching: "screens.communityMarketplace.category_tutoringCoaching",
  creative_freelance: "screens.communityMarketplace.category_creativeFreelance",
  events_services: "screens.communityMarketplace.category_eventsServices",
  other_services: "screens.communityMarketplace.category_otherServices",
};

export function categoryLabel(category: string, fallbackDisplayLabel?: string | null): string {
  const key = CATEGORY_I18N_KEYS[category];
  if (key) return t(key);
  return fallbackDisplayLabel || category;
}

export function categoryOptionLabel(category: CommunityListingCategory): string {
  return categoryLabel(category.key, category.display_label);
}
