import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

export type AutonomyMode = "silent" | "draft_to_user" | "one_tap_approve" | "auto_post";

export interface VaeaConfig {
  user_id: string;
  tenant_id: string;
  receive_recommendations: boolean;
  give_recommendations: boolean;
  make_money_goal: boolean;
  autonomy_default: AutonomyMode;
  autonomy_by_channel: Record<string, AutonomyMode>;
  voice_samples: string[];
  disclosure_text: string;
  expertise_zones: string[];
  excluded_categories: string[];
  blocked_counterparties: string[];
  max_replies_per_day: number;
  min_minutes_between_replies: number;
  mesh_scope: "maxina_only" | "open";
  updated_at?: string;
}

export interface VaeaCatalogItem {
  id: string;
  user_id: string;
  tenant_id: string;
  tier: "own" | "vetted_partner" | "affiliate_network";
  category: string;
  title: string;
  description: string | null;
  affiliate_url: string;
  affiliate_network: string | null;
  commission_percent: number | null;
  personal_note: string | null;
  vetting_status: "unvetted" | "tried" | "endorsed";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaeaChannel {
  id: string;
  user_id: string;
  tenant_id: string;
  platform: "maxina" | "slack" | "discord" | "telegram" | "reddit" | "custom";
  channel_key: string;
  display_name: string | null;
  config: Record<string, unknown>;
  autonomy: AutonomyMode | null;
  active: boolean;
  dry_run: boolean;
  last_ingested_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface VaeaDetectedQuestion {
  id: string;
  user_id: string;
  channel_id: string;
  platform: string;
  author_handle: string | null;
  message_body: string;
  message_url: string | null;
  posted_at: string | null;
  is_purchase_intent: number;
  topic_match: number;
  urgency: number;
  already_answered: number;
  poster_fit: number;
  combined_score: number;
  classifier_version: string;
  extracted_topics: string[];
  disposition: "scored" | "below_threshold" | "excluded" | "skipped" | "drafted" | "rejected_by_user";
  disposition_reason: string | null;
  created_at: string;
}

export interface VaeaDraft {
  id: string;
  user_id: string;
  detected_question_id: string;
  catalog_item_id: string | null;
  reply_body: string;
  reply_includes_disclosure: boolean;
  reply_includes_non_affiliate_alt: boolean;
  match_reason: string | null;
  match_score: number | null;
  match_tier: "own" | "vetted_partner" | "affiliate_network" | null;
  status: "shadow" | "pending_approval" | "approved" | "dismissed" | "expired";
  composer_version: string;
  created_at: string;
  expires_at: string;
  vaea_detected_questions?: Partial<VaeaDetectedQuestion>;
}

export interface VaeaSummary {
  ok: boolean;
  config: VaeaConfig | null;
  counts: {
    active_channels: number;
    active_catalog_items: number;
    open_drafts: number;
    questions_last_7d: number;
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function vaeaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${GATEWAY_URL}/vaea${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = await res.json();
      message = body?.error || body?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function useVaeaSummary() {
  const [data, setData] = useState<VaeaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<VaeaSummary>("/summary");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useVaeaConfig() {
  const [config, setConfig] = useState<VaeaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<{ ok: boolean; config: VaeaConfig | null }>("/config");
      setConfig(payload.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (patch: Partial<VaeaConfig>) => {
    const payload = await vaeaFetch<{ ok: boolean; config: VaeaConfig }>("/config", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    setConfig(payload.config);
    return payload.config;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { config, loading, error, reload, update };
}

export function useVaeaCatalog() {
  const [items, setItems] = useState<VaeaCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<{ ok: boolean; items: VaeaCatalogItem[] }>("/catalog");
      setItems(payload.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Partial<VaeaCatalogItem>) => {
    const res = await vaeaFetch<{ ok: boolean; item: VaeaCatalogItem }>("/catalog", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await reload();
    return res.item;
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await vaeaFetch(`/catalog/${id}`, { method: "DELETE" });
    await reload();
  }, [reload]);

  useEffect(() => { void reload(); }, [reload]);

  return { items, loading, error, reload, create, remove };
}

export function useVaeaDetectedQuestions(limit = 25) {
  const [questions, setQuestions] = useState<VaeaDetectedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<{ ok: boolean; questions: VaeaDetectedQuestion[] }>(
        `/detected-questions?limit=${limit}`,
      );
      setQuestions(payload.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void reload(); }, [reload]);

  return { questions, loading, error, reload };
}

export function useVaeaChannels() {
  const [channels, setChannels] = useState<VaeaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<{ ok: boolean; channels: VaeaChannel[] }>("/channels");
      setChannels(payload.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Partial<VaeaChannel>) => {
    const res = await vaeaFetch<{ ok: boolean; channel: VaeaChannel }>("/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await reload();
    return res.channel;
  }, [reload]);

  const patch = useCallback(async (id: string, body: Partial<VaeaChannel>) => {
    await vaeaFetch(`/channels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await vaeaFetch(`/channels/${id}`, { method: "DELETE" });
    await reload();
  }, [reload]);

  useEffect(() => { void reload(); }, [reload]);

  return { channels, loading, error, reload, create, patch, remove };
}

export function useVaeaDrafts(limit = 25) {
  const [drafts, setDrafts] = useState<VaeaDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaFetch<{ ok: boolean; drafts: VaeaDraft[] }>(
        `/drafts?limit=${limit}`,
      );
      setDrafts(payload.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const dismiss = useCallback(async (id: string) => {
    await vaeaFetch(`/drafts/${id}/dismiss`, { method: "POST" });
    await reload();
  }, [reload]);

  useEffect(() => { void reload(); }, [reload]);

  return { drafts, loading, error, reload, dismiss };
}
