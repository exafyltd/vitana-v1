import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { realtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { notify, notifyError } from '@/lib/i18n-toast';

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id?: string | null;
  contact_phone?: string | null;
  contact_name: string;
  contact_email?: string | null;
  is_on_platform: boolean;
  invite_sent_at?: string | null;
  /** Where an imported contact came from (google, icloud, microsoft, android); null when added by hand. */
  source?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
  // Enriched data from profiles
  contact_profile?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
    handle?: string;
  };
}

export function useContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all contacts with enriched profile data
  const fetchContacts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch contacts first
      const { data: contactsData, error: fetchError } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("contact_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Get unique user IDs that are on platform
      const platformUserIds = contactsData
        ?.filter(c => c.is_on_platform && c.contact_user_id)
        .map(c => c.contact_user_id) || [];

      // Fetch profiles for platform users
      let profilesMap: Record<string, any> = {};
      if (platformUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, handle")
          .in("user_id", platformUserIds);

        if (profilesError) console.error("Error fetching contact profiles:", profilesError);

        profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = { ...profile, source: "profiles" };
          return acc;
        }, {} as Record<string, any>);

        // VTID-05058: one query for every member without a profile row or an
        // avatar (was one query per member in a loop).
        const needGlobal = platformUserIds.filter(id => !profilesMap[id] || !profilesMap[id].avatar_url);
        if (needGlobal.length > 0) {
          const { data: globalProfiles, error: globalError } = await supabase
            .from("global_community_profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", needGlobal);

          if (globalError) {
            console.error("Error fetching global profiles:", globalError);
          } else {
            (globalProfiles || []).forEach(gp => {
              const existing = profilesMap[gp.user_id];
              profilesMap[gp.user_id] = existing
                ? { ...existing, avatar_url: existing.avatar_url || gp.avatar_url }
                : { ...gp, source: "global" };
            });
          }
        }
      }

      // Enrich contacts with profile data
      const enrichedContacts = contactsData?.map(contact => ({
        ...contact,
        contact_profile: contact.contact_user_id && profilesMap[contact.contact_user_id]
          ? profilesMap[contact.contact_user_id]
          : undefined,
      })) || [];

      setContacts(enrichedContacts as Contact[]);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setError(err as Error);
      notifyError('toasts.hooks.errorLoadingContacts');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  // Import contacts from conversation history
  const importFromConversations = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get all conversation participants
      const { data: participants, error: fetchError } = await supabase
        .rpc('get_conversation_participants', { p_user_id: user.id });
      
      if (fetchError) {
        throw new Error(`RPC Error: ${fetchError.message}`);
      }
      
      if (!participants || participants.length === 0) {
        notify('toasts.hooks.noConversationsFound', 'toasts.hooks.youHavenTMessagedAnyoneYet');
        return;
      }
      
      // Build lookup maps for existing contacts
      const existingByUserId = new Map(
        contacts
          .filter(c => c.contact_user_id)
          .map(c => [c.contact_user_id!, c])
      );
      
      const existingByEmail = new Map(
        contacts
          .filter(c => c.contact_email)
          .map(c => [c.contact_email!.toLowerCase(), c])
      );
      
      const existingByPhone = new Map(
        contacts
          .filter(c => c.contact_phone)
          .map(c => [c.contact_phone!.replace(/\D/g, ''), c])
      );
      
      // Categorize participants into updates vs new inserts
      const toUpdate: Array<{ contactId: string; participant: any }> = [];
      const toInsert: any[] = [];
      
      for (const p of participants) {
        const normalizedEmail = p.email?.toLowerCase();
        const normalizedPhone = p.phone?.replace(/\D/g, '');
        
        // Check if already exists by user_id, email, or phone
        let existingContact = existingByUserId.get(p.user_id);
        
        if (!existingContact && normalizedEmail) {
          existingContact = existingByEmail.get(normalizedEmail);
        }
        
        if (!existingContact && normalizedPhone) {
          existingContact = existingByPhone.get(normalizedPhone);
        }
        
        if (existingContact) {
          // Upgrade existing contact if not yet on platform
          if (!existingContact.is_on_platform || !existingContact.contact_user_id) {
            toUpdate.push({ contactId: existingContact.id, participant: p });
          }
        } else {
          // Truly new contact
          toInsert.push(p);
        }
      }
      
      let updatedCount = 0;
      let addedCount = 0;
      
      // Update existing contacts to mark them as on-platform
      if (toUpdate.length > 0) {
        for (const { contactId, participant } of toUpdate) {
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              is_on_platform: true,
              contact_user_id: participant.user_id,
              contact_name: participant.display_name || participant.full_name || 'Unknown',
              metadata: {
                imported_from: 'conversations',
                imported_at: new Date().toISOString(),
                last_message_at: participant.last_message_at,
              },
            })
            .eq('id', contactId)
            .eq('user_id', user.id);
          
          if (!updateError) {
            updatedCount++;
          }
        }
      }
      
      // Insert truly new contacts
      if (toInsert.length > 0) {
        const contactsToInsert = toInsert.map((p: any) => ({
          user_id: user.id,
          contact_user_id: p.user_id,
          contact_name: p.display_name || p.full_name || 'Unknown',
          contact_phone: p.phone,
          contact_email: p.email,
          is_on_platform: true,
          metadata: {
            imported_from: 'conversations',
            imported_at: new Date().toISOString(),
            last_message_at: p.last_message_at,
          },
        }));
        
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(contactsToInsert);
        
        if (insertError) {
          throw new Error(`Insert Error: ${insertError.message}`);
        }
        
        addedCount = toInsert.length;
      }
      
      // Refresh contacts list
      await fetchContacts();
      
      if (addedCount === 0 && updatedCount === 0) {
        notify('toasts.hooks.alreadyAdded', 'toasts.hooks.allConversationParticipantsAlreadyYourContacts');
      } else {
        const parts = [];
        if (addedCount > 0) parts.push(`${addedCount} added`);
        if (updatedCount > 0) parts.push(`${updatedCount} updated`);
        
        notify('toasts.hooks.contactsImported');
      }
    } catch (error) {
      console.error('Error importing from conversations:', error);
      notifyError('toasts.hooks.importFailed');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast, fetchContacts, contacts]);

  // Add a new contact
  const addContact = useCallback(async (
    contactData: {
      contact_name: string;
      contact_phone?: string;
      contact_email?: string;
      contact_user_id?: string; // For platform users from search
    }
  ) => {
    if (!user?.id) return null;

    try {
      // If contact_user_id is provided from search, it's already a platform user
      let isOnPlatform = !!contactData.contact_user_id;
      let contactUserId = contactData.contact_user_id || null;

      // VTID-05058: otherwise ask the server whether the number belongs to a
      // member. check_phone_on_platform (VTID-05057) answers only for a
      // verified number of a member who allows being found by it — never a
      // number someone merely typed into a profile.
      if (!isOnPlatform && contactData.contact_phone) {
        const { data: matches } = await supabase.rpc("check_phone_on_platform", {
          phone_number: contactData.contact_phone,
        });
        const match = Array.isArray(matches) ? matches[0] : null;
        if (match?.user_id && match.user_id !== user.id) {
          isOnPlatform = true;
          contactUserId = match.user_id;
        }
      }

      const { data, error: insertError } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          contact_name: contactData.contact_name,
          contact_phone: contactData.contact_phone,
          contact_email: contactData.contact_email,
          is_on_platform: isOnPlatform,
          contact_user_id: contactUserId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      notify(
        isOnPlatform ? 'mailhub.findFriends.added.onPlatformTitle' : 'mailhub.findFriends.added.savedTitle',
        isOnPlatform ? 'mailhub.findFriends.added.onPlatformBody' : 'mailhub.findFriends.added.savedBody',
        { name: contactData.contact_name },
      );

      await fetchContacts();
      return data;
    } catch (err) {
      console.error("Error adding contact:", err);
      notifyError('toasts.hooks.failedAddContact');
      return null;
    }
  }, [user?.id, toast, fetchContacts]);

  // Update a contact
  const updateContact = useCallback(async (
    contactId: string,
    updates: Partial<Pick<Contact, "contact_name" | "contact_phone" | "contact_email">>
  ) => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", contactId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      notify('toasts.hooks.contactUpdated', 'toasts.hooks.contactInformationHasUpdatedSuccessfully');

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error updating contact:", err);
      notifyError('toasts.hooks.failedUpdateContact');
      return false;
    }
  }, [user?.id, toast, fetchContacts]);

  // Delete a contact
  const deleteContact = useCallback(async (contactId: string) => {
    if (!user?.id) return false;

    try {
      const { error: deleteError } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      notify('toasts.hooks.contactDeleted', 'toasts.hooks.contactHasRemovedFromYourList');

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error deleting contact:", err);
      notifyError('toasts.hooks.failedDeleteContact');
      return false;
    }
  }, [user?.id, toast, fetchContacts]);

  // Search contacts
  const searchContacts = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.contact_name.toLowerCase().includes(lowerQuery) ||
      contact.contact_phone?.includes(query) ||
      contact.contact_email?.toLowerCase().includes(lowerQuery)
    );
  }, [contacts]);

  // Get contacts by platform status
  const platformContacts = contacts.filter(c => c.is_on_platform);
  const nonPlatformContacts = contacts.filter(c => !c.is_on_platform);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    fetchContacts();

    // VTID-05058: an import writes hundreds of rows at once; refetch once
    // after the burst instead of once per row.
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        refetchTimer = null;
        fetchContacts();
      }, 600);
    };

    const channel = realtimeChannel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast when contact joins platform
          if (payload.eventType === 'UPDATE' && 
              payload.new && payload.old &&
              (payload.new as any).is_on_platform && 
              !(payload.old as any).is_on_platform) {
            notify('toasts.hooks.contactJoinedVitana');
          }

          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      removeRealtimeChannel(channel);
    };
  }, [user?.id, fetchContacts, toast]);

  return {
    contacts,
    platformContacts,
    nonPlatformContacts,
    isLoading,
    error,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
    importFromConversations,
    refetch: fetchContacts,
  };
}
