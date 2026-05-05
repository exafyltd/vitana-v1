import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

        if (profilesError) {
          console.error("❌ Error fetching profiles:", profilesError);
        } else {
          console.log("✅ Fetched profiles:", profilesData);
        }

        profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = { ...profile, source: "profiles" };
          return acc;
        }, {} as Record<string, any>);

        console.log("📋 Profiles map:", profilesMap);

        // Fetch missing profiles from global_community_profiles
        const missingProfileIds = platformUserIds.filter(id => !profilesMap[id]);
        
        if (missingProfileIds.length > 0) {
          const { data: globalProfiles, error: globalError } = await supabase
            .from("global_community_profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", missingProfileIds);

          if (globalError) {
            console.error("❌ Error fetching global profiles:", globalError);
          } else {
            console.log("🌍 Fetched global profiles:", globalProfiles);
            
            // Merge global profiles into profilesMap
            (globalProfiles || []).forEach(gp => {
              profilesMap[gp.user_id] = { ...gp, source: "global" };
            });
          }
        }

        // Fill missing avatar_urls from global profiles if needed
        for (const userId of platformUserIds) {
          if (profilesMap[userId] && !profilesMap[userId].avatar_url) {
            const { data: globalProfile } = await supabase
              .from("global_community_profiles")
              .select("avatar_url")
              .eq("user_id", userId)
              .single();
            
            if (globalProfile?.avatar_url) {
              profilesMap[userId].avatar_url = globalProfile.avatar_url;
              console.log("🔄 Filled avatar from global for:", userId);
            }
          }
        }
      }

      // Enrich contacts with profile data
      const enrichedContacts = contactsData?.map(contact => {
        const enriched = {
          ...contact,
          contact_profile: contact.contact_user_id && profilesMap[contact.contact_user_id]
            ? profilesMap[contact.contact_user_id]
            : undefined,
        };
        
        if (contact.is_on_platform) {
          console.log("🔍 Enriched contact:", {
            name: contact.contact_name,
            contact_user_id: contact.contact_user_id,
            has_profile: !!enriched.contact_profile,
            avatar_url: enriched.contact_profile?.avatar_url,
            source: enriched.contact_profile?.source || "none"
          });
        }
        
        return enriched;
      }) || [];

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

      // Otherwise check if phone matches a platform user
      if (!isOnPlatform && contactData.contact_phone) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", contactData.contact_phone)
          .single();

        if (profileData) {
          isOnPlatform = true;
          contactUserId = profileData.user_id;
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

      toast({
        title: isOnPlatform ? "Contact added!" : "Contact saved",
        description: isOnPlatform 
          ? `${contactData.contact_name} is on VITANA! You can message them now.`
          : `${contactData.contact_name} added to your contacts.`,
      });

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

  // Send invite to a contact
  const inviteContact = useCallback(async (contactId: string, channel: 'sms' | 'email') => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ invite_sent_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      notify('toasts.hooks.inviteSent');

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error sending invite:", err);
      notifyError('toasts.hooks.failedSendInvite');
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

    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Contact change detected:', payload);
          
          // Show toast when contact joins platform
          if (payload.eventType === 'UPDATE' && 
              payload.new && payload.old &&
              (payload.new as any).is_on_platform && 
              !(payload.old as any).is_on_platform) {
            notify('toasts.hooks.contactJoinedVitana');
          }
          
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    inviteContact,
    searchContacts,
    importFromConversations,
    refetch: fetchContacts,
  };
}
