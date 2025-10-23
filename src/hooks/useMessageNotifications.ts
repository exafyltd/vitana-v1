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
              .select('display_name, avatar_url')
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
            
            // Create in-app notification in database
            const messagePreview = newMessage.body?.substring(0, 100) || 'New message';
            const notificationTitle = isGroup 
              ? `${senderName} in ${thread?.name || 'group chat'}`
              : senderName;

            const { error: notifError } = await supabase.from('notifications').insert({
              user_id: user.id, // CRITICAL: Set recipient
              type: isGroup ? 'new_group_message' : 'new_message',
              title: notificationTitle,
              message: messagePreview,
              data: {
                thread_id: newMessage.thread_id,
                message_id: newMessage.id,
                sender_id: newMessage.sender_id,
                sender_avatar: senderProfile?.avatar_url,
                context: 'global'
              }
            } as any);

            if (notifError) {
              console.error('Failed to create notification:', notifError);
            }
            
            // Also send push notification
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
              .select('display_name, full_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            // Get thread info for groups
            let isGroup = false;
            let threadName = null;
            if (newMessage.thread_id) {
              const { data: thread } = await supabase
                .from('message_threads')
                .select('type, name')
                .eq('id', newMessage.thread_id)
                .maybeSingle();
              
              isGroup = thread?.type === 'group';
              threadName = thread?.name;
            }

            const senderName = senderProfile?.display_name || 
                              senderProfile?.full_name || 
                              'Someone';
            
            // Create in-app notification in database
            const messagePreview = newMessage.body?.substring(0, 100) || 'New message';
            const notificationTitle = isGroup 
              ? `${senderName} in ${threadName || 'group chat'}`
              : senderName;

            const { error: notifError } = await supabase.from('notifications').insert({
              user_id: user.id, // CRITICAL: Set recipient
              type: isGroup ? 'new_group_message' : 'new_message',
              title: notificationTitle,
              message: messagePreview,
              data: {
                thread_id: newMessage.thread_id || `dm-${newMessage.id}`,
                message_id: newMessage.id,
                sender_id: newMessage.sender_id,
                sender_avatar: senderProfile?.avatar_url,
                context: 'tenant'
              }
            } as any);

            if (notifError) {
              console.error('Failed to create notification:', notifError);
            }
            
            // Also send push notification
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

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  push_enabled: boolean;
  dnd_enabled: boolean;
  dnd_start_time: string | null;
  dnd_end_time: string | null;
  email_events: boolean;
  email_appointments: boolean;
  email_ai_tips: boolean;
  email_weekly_reports: boolean;
  push_group_messages: boolean;
  push_goal_reminders: boolean;
  push_friend_activity: boolean;
  push_breaking_news: boolean;
  inapp_messages: boolean;
  inapp_system: boolean;
  inapp_achievements: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to handle notification settings with database integration
 */
export function useNotificationSettings() {
  const { user } = useAuth();

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      console.log('✅ Notification settings updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      throw error;
    }
  };

  const getNotificationSettings = async (): Promise<NotificationSettings | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Return data with defaults if no settings exist yet
      if (!data) {
        return {
          push_enabled: false,
          dnd_enabled: false,
          dnd_start_time: null,
          dnd_end_time: null,
          email_events: true,
          email_appointments: true,
          email_ai_tips: true,
          email_weekly_reports: false,
          push_group_messages: true,
          push_goal_reminders: true,
          push_friend_activity: false,
          push_breaking_news: false,
          inapp_messages: true,
          inapp_system: true,
          inapp_achievements: true,
        };
      }

      return data as NotificationSettings;
    } catch (error) {
      console.error('❌ Error getting notification settings:', error);
      return null;
    }
  };

  return {
    updateNotificationSettings,
    getNotificationSettings
  };
}