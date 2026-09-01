import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from '@/hooks/use-toast';
import { MatchedContact, ImportedContact } from "@/components/contacts/DedupePreviewList";
import { notify } from '@/lib/i18n-toast';

export type ContactSource = "google" | "icloud" | "phonebook" | "whatsapp";

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

interface RawContact {
  name?: string[];
  tel?: string[];
  email?: string[];
}

export function useContactSync() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Hash contact data for privacy-preserving matching
  const hashContact = async (value: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Import from device phonebook using Contact Picker API
  const importFromPhonebook = async (): Promise<RawContact[]> => {
    if (!("contacts" in navigator)) {
      throw new Error("Contact Picker API not available");
    }

    try {
      const props = ["name", "tel", "email"];
      const opts = { multiple: true };
      
      // @ts-ignore - Contact Picker API not in TypeScript types
      const contacts = await navigator.contacts.select(props, opts);
      return contacts || [];
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error("Contact selection cancelled");
      }
      throw error;
    }
  };

  // Match contacts against platform users
  const matchContacts = async (
    rawContacts: RawContact[]
  ): Promise<{ matches: MatchedContact[]; nonMatches: ImportedContact[] }> => {
    const matches: MatchedContact[] = [];
    const nonMatches: ImportedContact[] = [];

    // Get all phones and emails to check
    const phonesToCheck: string[] = [];
    const emailsToCheck: string[] = [];
    
    rawContacts.forEach(contact => {
      if (contact.tel?.[0]) {
        phonesToCheck.push(contact.tel[0].replace(/\D/g, ""));
      }
      if (contact.email?.[0]) {
        emailsToCheck.push(contact.email[0].toLowerCase());
      }
    });

    // Query profiles for matches
    let profileMatches: Record<string, any> = {};
    
    if (phonesToCheck.length > 0) {
      const { data: phoneProfiles, error: phoneError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, handle, phone")
        .in("phone", phonesToCheck);

      if (phoneError) {
        // A real DB failure here previously looked identical to "none of
        // these phone numbers matched" — the contact match pass continues
        // and reports a false "0 of your contacts use Vitana" instead.
        console.error("[useContactSync] Failed to match contacts by phone:", phoneError);
      }

      phoneProfiles?.forEach(p => {
        if (p.phone) {
          profileMatches[p.phone.replace(/\D/g, "")] = p;
        }
      });
    }

    // Also check global community profiles
    if (emailsToCheck.length > 0) {
      const { data: emailProfiles, error: emailError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, handle, email")
        .in("email", emailsToCheck);

      if (emailError) {
        // Same failure shape as the phone lookup above: a real error looks
        // identical to "no email matches" without this log.
        console.error("[useContactSync] Failed to match contacts by email:", emailError);
      }

      emailProfiles?.forEach(p => {
        if (p.email) {
          profileMatches[p.email.toLowerCase()] = p;
        }
      });
    }

    // Categorize contacts
    rawContacts.forEach((contact, index) => {
      const phone = contact.tel?.[0]?.replace(/\D/g, "");
      const email = contact.email?.[0]?.toLowerCase();
      const name = contact.name?.[0] || "Unknown";
      const id = `imported-${index}-${Date.now()}`;

      const matchedProfile = (phone && profileMatches[phone]) || 
                            (email && profileMatches[email]);

      if (matchedProfile) {
        matches.push({
          localContact: { id, name, phone, email },
          platformUser: {
            user_id: matchedProfile.user_id,
            display_name: matchedProfile.display_name || name,
            avatar_url: matchedProfile.avatar_url,
            handle: matchedProfile.handle,
          },
          matchConfidence: phone && profileMatches[phone] ? "exact" : "probable",
        });
      } else {
        nonMatches.push({ id, name, phone, email });
      }
    });

    return { matches, nonMatches };
  };

  // Main sync function
  const syncContacts = useCallback(async (
    sources: ContactSource[]
  ): Promise<SyncResult> => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setIsSyncing(true);

    try {
      let allRawContacts: RawContact[] = [];

      // Import from each selected source
      for (const source of sources) {
        switch (source) {
          case "phonebook":
            const phonebookContacts = await importFromPhonebook();
            allRawContacts.push(...phonebookContacts);
            break;
          
          case "google":
            // TODO: Implement Google OAuth flow
            notify('toasts.hooks.comingSoon', 'toasts.hooks.googleContactsImportWillAvailableSoon');
            break;
          
          case "icloud":
            // TODO: Implement iCloud integration
            notify('toasts.hooks.comingSoon', 'toasts.hooks.icloudImportWillAvailableSoon');
            break;
          
          case "whatsapp":
            // TODO: Implement WhatsApp export import
            notify('toasts.hooks.comingSoon', 'toasts.hooks.whatsappImportWillAvailableSoon');
            break;
        }
      }

      // Match contacts
      const { matches, nonMatches } = await matchContacts(allRawContacts);

      // Save non-matched contacts to database
      if (nonMatches.length > 0) {
        const contactsToInsert = nonMatches.map(contact => ({
          user_id: user.id,
          contact_name: contact.name,
          contact_phone: contact.phone,
          contact_email: contact.email,
          is_on_platform: false,
          metadata: {
            import_source: sources[0],
            imported_at: new Date().toISOString(),
            consent_given: true,
          },
        }));

        const { error: insertError } = await supabase
          .from("contacts")
          .upsert(contactsToInsert, {
            onConflict: "user_id,contact_phone",
            ignoreDuplicates: true,
          });

        if (insertError) {
          console.error("Error saving contacts:", insertError);
        }
      }

      // Save matched contacts with platform link
      if (matches.length > 0) {
        const matchedToInsert = matches.map(match => ({
          user_id: user.id,
          contact_user_id: match.platformUser.user_id,
          contact_name: match.platformUser.display_name,
          contact_phone: match.localContact.phone,
          contact_email: match.localContact.email,
          is_on_platform: true,
          metadata: {
            import_source: sources[0],
            imported_at: new Date().toISOString(),
            consent_given: true,
            match_confidence: match.matchConfidence,
          },
        }));

        const { error: insertError } = await supabase
          .from("contacts")
          .upsert(matchedToInsert, {
            onConflict: "user_id,contact_user_id",
            ignoreDuplicates: true,
          });

        if (insertError) {
          console.error("Error saving matched contacts:", insertError);
        }
      }

      return {
        matches,
        nonMatches,
        totalImported: matches.length + nonMatches.length,
      };
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, toast]);

  return {
    connectedSources,
    isSyncing,
    hasConsented,
    recordConsent,
    syncContacts,
  };
}

export default useContactSync;
