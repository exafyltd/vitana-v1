import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

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
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, handle")
          .in("user_id", platformUserIds);

        profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as Record<string, any>);
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
      toast({
        title: "Error loading contacts",
        description: err instanceof Error ? err.message : "Failed to load contacts",
        variant: "destructive",
      });
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
      
      if (fetchError) throw fetchError;
      
      if (!participants || participants.length === 0) {
        toast({
          title: "No Conversations Found",
          description: "You haven't messaged anyone yet.",
        });
        return;
      }
      
      // Filter out existing contacts to avoid duplicates
      const existingContactUserIds = contacts
        .filter(c => c.contact_user_id)
        .map(c => c.contact_user_id);
      
      const newParticipants = participants.filter(
        (p: any) => !existingContactUserIds.includes(p.user_id)
      );
      
      if (newParticipants.length === 0) {
        toast({
          title: "Already Added",
          description: "All conversation participants are already in your contacts.",
        });
        return;
      }
      
      // Bulk insert new contacts
      const contactsToInsert = newParticipants.map((p: any) => ({
        user_id: user.id,
        contact_user_id: p.user_id,
        contact_name: p.display_name || p.full_name || 'Unknown',
        contact_phone: p.phone,
        contact_email: p.email,
        is_on_platform: true,
        metadata: {
          imported_from: 'conversations',
          imported_at: new Date().toISOString(),
          last_message_at: p.last_message_at
        }
      }));
      
      const { error: insertError } = await supabase
        .from('contacts')
        .insert(contactsToInsert);
      
      if (insertError) throw insertError;
      
      // Refresh contacts list
      await fetchContacts();
      
      toast({
        title: "Contacts Imported",
        description: `Added ${newParticipants.length} contact${newParticipants.length > 1 ? 's' : ''} from your conversations.`,
      });
    } catch (error) {
      console.error('Error importing from conversations:', error);
      toast({
        title: "Import Failed",
        description: "Could not import contacts from conversations.",
        variant: "destructive",
      });
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
      toast({
        title: "Failed to add contact",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
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

      toast({
        title: "Contact updated",
        description: "Contact information has been updated successfully.",
      });

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error updating contact:", err);
      toast({
        title: "Failed to update contact",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
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

      toast({
        title: "Contact deleted",
        description: "Contact has been removed from your list.",
      });

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error deleting contact:", err);
      toast({
        title: "Failed to delete contact",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
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

      toast({
        title: "Invite sent!",
        description: `Invitation sent via ${channel}. We'll notify you when they join VITANA.`,
      });

      await fetchContacts();
      return true;
    } catch (err) {
      console.error("Error sending invite:", err);
      toast({
        title: "Failed to send invite",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
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
            toast({
              title: "Contact joined VITANA! 🎉",
              description: `${(payload.new as any).contact_name} is now on VITANA. You can message them now!`,
            });
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
