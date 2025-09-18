import { supabase } from '@/integrations/supabase/client';

export interface MessageStatus {
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

/**
 * Mark a message as delivered (idempotent - won't regress from read status)
 */
export async function markMessageAsDelivered(
  messageId: string, 
  isGlobalMessage: boolean = false
): Promise<void> {
  const table = isGlobalMessage ? 'global_messages' : 'messages';
  
  try {
    // Only update if not already read (idempotent check)
    const { error } = await supabase
      .from(table)
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', messageId)
      .is('read_at', null); // Only update if not read yet
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking message as delivered:', error);
  }
}

/**
 * Mark a message as read (will also set delivered_at if not set)
 */
export async function markMessageAsRead(
  messageId: string, 
  isGlobalMessage: boolean = false
): Promise<void> {
  const table = isGlobalMessage ? 'global_messages' : 'messages';
  
  try {
    const now = new Date().toISOString();
    
    // Get current message to check if delivered_at needs to be set
    const { data: message, error: fetchError } = await supabase
      .from(table)
      .select('delivered_at, read_at')
      .eq('id', messageId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Don't regress if already read
    if (message?.read_at) return;
    
    const updateData: Partial<MessageStatus> = {
      read_at: now
    };
    
    // Set delivered_at if not already set (messages are delivered when read)
    if (!message?.delivered_at) {
      updateData.delivered_at = now;
    }
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
}

/**
 * Mark multiple messages as read (batch operation)
 */
export async function markMessagesAsRead(
  messageIds: string[], 
  isGlobalMessage: boolean = false
): Promise<void> {
  const table = isGlobalMessage ? 'global_messages' : 'messages';
  
  try {
    const now = new Date().toISOString();
    
    // Update all messages that aren't already read
    const { error } = await supabase
      .from(table)
      .update({ 
        delivered_at: now, // Ensure delivery when marking as read
        read_at: now 
      })
      .in('id', messageIds)
      .is('read_at', null); // Only update unread messages
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Get message status based on timestamps (WhatsApp-style)
 */
export function getMessageStatusFromTimestamps(message: MessageStatus & { created_at?: string }): 
  'sending' | 'sent' | 'delivered' | 'read' {
  
  if (message.read_at) {
    return 'read';
  }
  
  if (message.delivered_at) {
    return 'delivered';
  }
  
  if (message.sent_at || message.created_at) {
    return 'sent';
  }
  
  return 'sending';
}

/**
 * Auto-mark messages as delivered when they appear in recipient's view
 */
export async function autoMarkAsDelivered(
  messages: Array<{ id: string; sender_id: string }>,
  currentUserId: string,
  isGlobalMessage: boolean = false
): Promise<void> {
  // Only mark messages from other users as delivered
  const otherUsersMessages = messages.filter(msg => msg.sender_id !== currentUserId);
  
  if (otherUsersMessages.length === 0) return;
  
  const messageIds = otherUsersMessages.map(msg => msg.id);
  
  for (const messageId of messageIds) {
    await markMessageAsDelivered(messageId, isGlobalMessage);
  }
}