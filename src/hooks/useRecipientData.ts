import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecipientData {
  id: string;
  name: string;
  avatar?: string;
}

export const useRecipientData = (recipientId?: string | null, threadId?: string) => {
  const [recipient, setRecipient] = useState<RecipientData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecipientData = async () => {
      if (!recipientId && !threadId) {
        setRecipient(null);
        return;
      }

      setLoading(true);
      try {
        let targetUserId = recipientId;
        
        // If no direct recipientId but we have a threadId, get other participants
        if (!targetUserId && threadId) {
          // Try global context first, then tenant context
          let participants = null;
          
          try {
            const { data: globalParticipants } = await supabase.rpc('get_thread_participants_text', {
              thread_id_param: threadId,
              context_param: 'global'
            });
            participants = globalParticipants;
          } catch (error) {
            // If global fails, try tenant context
            try {
              const { data: tenantParticipants } = await supabase.rpc('get_thread_participants_text', {
                thread_id_param: threadId,
                context_param: 'tenant'
              });
              participants = tenantParticipants;
            } catch (tenantError) {
              console.error('Error fetching thread participants:', tenantError);
            }
          }
          
          if (participants && participants.length > 0) {
            // Find the other participant (not current user)
            const { data: { user } } = await supabase.auth.getUser();
            const otherParticipant = participants.find(p => p.user_id !== user?.id);
            if (otherParticipant) {
              targetUserId = otherParticipant.user_id;
            }
          }
        }

        if (targetUserId) {
          // Try global profiles first, then fallback to regular profiles
          const { data: globalProfiles } = await supabase
            .from('global_community_profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', targetUserId)
            .eq('is_visible', true)
            .limit(1);

          if (globalProfiles && globalProfiles.length > 0) {
            const profile = globalProfiles[0];
            const recipientData = {
              id: targetUserId,
              name: profile.display_name || 'Unknown User',
              avatar: profile.avatar_url
            };
            setRecipient(recipientData);
          } else {
            // Fallback to regular profiles
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, display_name, full_name, avatar_url')
              .eq('user_id', targetUserId)
              .limit(1);

            if (profiles && profiles.length > 0) {
              const profile = profiles[0];
              const recipientData = {
                id: targetUserId,
                name: profile.display_name || profile.full_name || 'Unknown User',
                avatar: profile.avatar_url
              };
              setRecipient(recipientData);
            } else {
              const fallbackRecipient = {
                id: targetUserId,
                name: 'Unknown User',
                avatar: undefined
              };
              setRecipient(fallbackRecipient);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching recipient data:', error);
        setRecipient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipientData();
  }, [recipientId, threadId]);

  return { recipient, loading };
};