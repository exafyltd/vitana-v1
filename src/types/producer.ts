/**
 * Producer / Agency Mode Types
 * 
 * These types extend event metadata to support Producer Mode,
 * where a user creates events on behalf of clients and acts
 * as the primary reseller/coordinator.
 * 
 * NOTE: This uses the existing JSONB metadata field in global_community_events.
 * No database migration is required.
 */

export interface ProducerModeMetadata {
  /** Indicates this event was created in Producer Mode */
  producer_mode?: boolean;
  /** UUID of the user acting as producer */
  producer_user_id?: string;
  /** Reseller profile ID used at creation time */
  producer_reseller_profile_id?: string;
  /** Reseller code at creation time */
  producer_reseller_code?: string;
  /** Free-text label of the client/company */
  producer_client_name?: string;
}

export interface OrganizerMetadata {
  /** UUID if organizer has a VITANA account (optional) */
  organizer_user_id?: string | null;
  /** Contact email for the client/company */
  organizer_contact_email?: string | null;
  /** Contact phone (optional) */
  organizer_contact_phone?: string | null;
  /** Legal/company name for invoicing */
  organizer_legal_name?: string | null;
  /** Payout method: manual, bank_transfer, invoice, other */
  organizer_payout_method?: 'manual' | 'bank_transfer' | 'invoice' | 'other' | null;
  /** Free text for internal notes (e.g., invoice terms) */
  organizer_notes?: string | null;
}

export interface EventMetadataWithProducer extends ProducerModeMetadata, OrganizerMetadata {
  is_paid?: boolean;
  has_tickets?: boolean;
  price?: number;
  event_id?: string;
  event_type?: string;
  event_location?: string;
  cover_image_url?: string;
  ticket_url?: string;
  checkout_url?: string;
  booking_url?: string;
  external_url?: string;
  client?: {
    name?: string;
    company?: string;
    email?: string;
    notes?: string;
  };
}

/**
 * Helper to check if an event is a client event created by a specific user
 */
export function isClientEvent(
  metadata: Record<string, unknown> | null | undefined,
  userId?: string
): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  if (!metadata.producer_mode) return false;
  if (userId && metadata.producer_user_id !== userId) return false;
  return true;
}

/**
 * Helper to get client name from metadata
 * Prefers organizer_legal_name over producer_client_name
 */
export function getClientName(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return (metadata.organizer_legal_name as string) || 
         (metadata.producer_client_name as string) || 
         null;
}

/**
 * Helper to get organizer display name from metadata
 * Prefers organizer_legal_name over producer_client_name
 */
export function getOrganizerName(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return (metadata.organizer_legal_name as string) || 
         (metadata.producer_client_name as string) || 
         null;
}

/**
 * Helper to get organizer contact email from metadata
 */
export function getOrganizerEmail(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return (metadata.organizer_contact_email as string) || null;
}

/**
 * Helper to get organizer payout method from metadata
 */
export function getOrganizerPayoutMethod(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return (metadata.organizer_payout_method as string) || null;
}
