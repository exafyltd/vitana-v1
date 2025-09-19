import { useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { notifyNewMessage } from '@/lib/pushNotifications';

/**
 * Hook to handle real-time message notifications
 */
export function useMessageNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new global messages
    const globalChannel = supabase
      .channel('global_message_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't notify for own messages
          if (newMessage.sender_id === user.id) return;

          try {
            // Get thread participants to check if current user is involved
            const { data: participants } = await supabase
              .from('global_thread_participants')
              .select('user_id')
              .eq('thread_id', newMessage.thread_id)
              .eq('user_id', user.id)
              .eq('is_active', true)
              .maybeSingle();

            if (!participants) return; // User not in this thread

            // Get sender info
            const { data: senderProfile } = await supabase
              .from('global_community_profiles')
              .select('display_name')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            // Get thread info to check if it's a group
            const { data: thread } = await supabase
              .from('global_message_threads')
              .select('type, name')
              .eq('id', newMessage.thread_id)
              .maybeSingle();

            const senderName = senderProfile?.display_name || 'Someone';
            const isGroup = thread?.type === 'group';
            
            await notifyNewMessage(
              senderName,
              newMessage.body,
              newMessage.thread_id,
              isGroup
            );

          } catch (error) {
            console.error('Error processing global message notification:', error);
          }
        }
      )
      .subscribe();

    // Subscribe to new tenant messages
    const tenantChannel = supabase
      .channel('tenant_message_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't notify for own messages
          if (newMessage.sender_id === user.id) return;

          try {
            // Check if message involves current user (direct message or thread participant)
            const isDirectMessage = newMessage.recipient_id === user.id;
            let isThreadParticipant = false;

            if (newMessage.thread_id) {
              const { data: participants } = await supabase
                .from('thread_participants')
                .select('user_id')
                .eq('thread_id', newMessage.thread_id)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

              isThreadParticipant = !!participants;
            }

            if (!isDirectMessage && !isThreadParticipant) return;

            // Get sender info
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('display_name, full_name')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            // Get thread info for groups
            let isGroup = false;
            if (newMessage.thread_id) {
              const { data: thread } = await supabase
                .from('message_threads')
                .select('type')
                .eq('id', newMessage.thread_id)
                .maybeSingle();
              
              isGroup = thread?.type === 'group';
            }

            const senderName = senderProfile?.display_name || 
                              senderProfile?.full_name || 
                              'Someone';
            
            await notifyNewMessage(
              senderName,
              newMessage.body,
              newMessage.thread_id || `dm-${newMessage.id}`,
              isGroup
            );

          } catch (error) {
            console.error('Error processing tenant message notification:', error);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(tenantChannel);
    };
  }, [user]);
}

/**
 * Hook to handle notification settings
 */
export function useNotificationSettings() {
  const { user } = useAuth();

  const updateNotificationSettings = async (settings: {
    push_enabled?: boolean;
    dnd_enabled?: boolean;
    dnd_start_time?: string;
    dnd_end_time?: string;
  }) => {
    if (!user) return;

    try {
      // Note: notification_settings table needs to be created
      console.log('Notification settings update:', settings);
      // await supabase.from('notification_settings').upsert({...})
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  };

  const getNotificationSettings = async () => {
    if (!user) return null;

    try {
      // Note: notification_settings table needs to be created
      console.log('Getting notification settings for user:', user.id);
      return null; // await supabase.from('notification_settings').select(...)
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  };

  return {
    updateNotificationSettings,
    getNotificationSettings
  };
}