/** VTID-05645 — the intent-match row the opportunities page reads (web `IntentMatch`, the fields it renders). */
export interface IntentMatch {
  match_id: string;
  intent_a_id: string;
  vitana_id_a: string | null;
  vitana_id_b: string | null;
  kind_pairing: string;
  score: number;
  match_reasons: Record<string, unknown>;
  compass_aligned: boolean;
  state: string;
  redacted?: boolean;
  partner_display_name?: string | null;
  partner_avatar_url?: string | null;
}
