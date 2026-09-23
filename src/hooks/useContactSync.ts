import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { MatchedContact, ImportedContact } from "@/components/contacts/DedupePreviewList";
import {
  contactPickerSupported,
  fetchConnectedApps,
  importAndroidContacts,
  pickDeviceContacts,
  syncConnectedApp,
  type ConnectedAppId,
} from "@/lib/connected-apps-client";

export type ContactSource = "google" | "outlook" | "icloud" | "phonebook" | "whatsapp";

interface ConnectedSource {
  source: ContactSource;
  isConnected: boolean;
  contactCount: number;
  lastSyncedAt: Date | null;
}

interface SyncResult {
  matches: MatchedContact[];
  nonMatches: ImportedContact[];
  totalImported: number;
}

/** Google / Outlook / iCloud still have to be switched on in Connected Apps. */
export class ConnectAppFirst extends Error {
  constructor(public app: ConnectedAppId) {
    super("connect_required");
  }
}

const HUB_APP: Partial<Record<ContactSource, ConnectedAppId>> = {
  google: "google-contacts",
  outlook: "outlook-contacts",
  icloud: "iphone-contacts",
};

/** `contacts.source` value each hub import writes (VTID-04449: Outlook → microsoft). */
const DB_SOURCE: Partial<Record<ContactSource, string>> = {
  google: "google",
  outlook: "microsoft",
  icloud: "icloud",
};

const PREVIEW_LIMIT = 500;

/** What the hub imported for these sources, shaped for the preview list. */
async function readImported(userId: string, sources: string[]): Promise<SyncResult> {
  if (sources.length === 0) return { matches: [], nonMatches: [], totalImported: 0 };
  // `source` (VTID-04405) is newer than the generated types, hence the loose client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("contacts")
    .select("id, contact_name, contact_phone, contact_email, contact_user_id, is_on_platform")
    .eq("user_id", userId)
    .in("source", sources)
    .order("contact_name", { ascending: true })
    .limit(PREVIEW_LIMIT);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    contact_name: string;
    contact_phone: string | null;
    contact_email: string | null;
    contact_user_id: string | null;
    is_on_platform: boolean;
  }>;
  const memberIds = rows.filter((r) => r.is_on_platform && r.contact_user_id).map((r) => r.contact_user_id as string);
  const profiles: Record<string, { display_name?: string; avatar_url?: string; handle?: string }> = {};
  if (memberIds.length > 0) {
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, handle")
      .in("user_id", memberIds);
    if (profError) console.error("[useContactSync] Failed to load member profiles:", profError);
    for (const p of prof ?? []) profiles[p.user_id] = p;
  }
  const matches: MatchedContact[] = [];
  const nonMatches: ImportedContact[] = [];
  for (const r of rows) {
    const local = { id: r.id, name: r.contact_name, phone: r.contact_phone ?? undefined, email: r.contact_email ?? undefined };
    if (r.is_on_platform && r.contact_user_id) {
      const p = profiles[r.contact_user_id] ?? {};
      matches.push({
        localContact: local,
        platformUser: { user_id: r.contact_user_id, display_name: p.display_name || r.contact_name, avatar_url: p.avatar_url, handle: p.handle },
        matchConfidence: "exact",
      });
    } else {
      nonMatches.push(local);
    }
  }
  return { matches, nonMatches, totalImported: rows.length };
}

export function useContactSync() {
  const { user } = useAuth();
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  // Check consent status on mount
  useEffect(() => {
    if (user?.id) {
      checkConsentStatus();
    }
  }, [user?.id]);

  const checkConsentStatus = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("metadata")
        .eq("user_id", user.id)
        .limit(1);

      // If user has any contacts with sync metadata, they've consented
      const hasExistingConsent = data?.some(c => {
        const meta = c.metadata as Record<string, unknown> | null;
        return meta?.import_source && meta?.consent_given;
      });
      
      // Also check localStorage for current session consent
      const sessionConsent = localStorage.getItem(`contact_sync_consent_${user.id}`);
      
      setHasConsented(!!hasExistingConsent || sessionConsent === "true");
    } catch (error) {
      console.error("Error checking consent:", error);
    }
  };

  const recordConsent = useCallback(() => {
    if (!user?.id) return;
    
    // Store consent in localStorage for session
    localStorage.setItem(`contact_sync_consent_${user.id}`, "true");
    setHasConsented(true);

    // Log consent event
    console.log("[ContactSync] Consent recorded for user:", user.id);
  }, [user?.id]);

  // Main sync function — VTID-04440: every source goes through the Connected
  // Apps hub (the gateway), which de-duplicates per source, matches members
  // server-side and keeps test / service accounts out (CLAUDE.md rule 45).
  // Google and iCloud must be switched on in Connected Apps first; the phone
  // book uses the browser Contact Picker (Android Chrome).
  const syncContacts = useCallback(async (
    sources: ContactSource[]
  ): Promise<SyncResult> => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setIsSyncing(true);

    try {
      const hubSources: string[] = [];
      const needsHubState = sources.some((s) => Boolean(HUB_APP[s]));
      const apps = needsHubState ? await fetchConnectedApps() : [];

      for (const source of sources) {
        const appId = HUB_APP[source];
        if (source === "phonebook") {
          if (!contactPickerSupported()) throw new Error("Contact Picker API not available");
          let picked;
          try {
            picked = await pickDeviceContacts();
          } catch (error) {
            if ((error as Error).name === "AbortError") throw new Error("Contact selection cancelled");
            throw error;
          }
          if (picked.length === 0) throw new Error("Contact selection cancelled");
          await importAndroidContacts(picked);
          hubSources.push("android");
        } else if (appId) {
          const app = apps.find((a) => a.id === appId);
          if (!app || app.status !== "on") throw new ConnectAppFirst(appId);
          const r = await syncConnectedApp(appId);
          if (!r.ok) throw new Error(r.error ?? "sync_failed");
          hubSources.push(DB_SOURCE[source] ?? source);
        }
        // whatsapp: no import path exists; the picker no longer offers it.
      }

      return await readImported(user.id, hubSources);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id]);

  return {
    connectedSources,
    isSyncing,
    hasConsented,
    recordConsent,
    syncContacts,
  };
}

export default useContactSync;
