/**
 * VTID-05143 — the props every Unified Card System card takes, wherever it is
 * rendered (strip, News feed, chat). One card component per card_type.
 */
export interface VitanaCardProps {
  /** Server-localized headline (GET /enrichment-cards); falls back to the card's catalog copy. */
  title?: string;
  /** Server-localized subtext; falls back to the card's catalog copy. */
  description?: string;
  /** Versioned chat payload params (`content_data.card.params`); cards ignore keys they do not know. */
  params?: Record<string, unknown>;
  /** Absent → the card shows no X. */
  onDismiss?: () => void;
}
