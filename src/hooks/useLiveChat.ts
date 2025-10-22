import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage } from '@/types/chat';

interface UseLiveChatProps {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

export const useLiveChat = ({ roomId, userId, userName, userAvatar }: UseLiveChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create channel for this room
    const channel = supabase.channel(`live-chat:${roomId}`);

    // Listen for chat messages
    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload as ChatMessage]);
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        setMessages(prev => [...prev, payload as ChatMessage]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const sendMessage = async (message: string) => {
    if (!channelRef.current || !message.trim()) return;

    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${userId}`,
      userId,
      userName,
      userAvatar,
      message: message.trim(),
      timestamp: new Date(),
      type: 'chat',
    };

    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: chatMessage,
    });
  };

  const sendReaction = async (emoji: string) => {
    if (!channelRef.current) return;

    const reactionMessage: ChatMessage = {
      id: `${Date.now()}-${userId}`,
      userId,
      userName,
      userAvatar,
      message: '',
      emoji,
      timestamp: new Date(),
      type: 'reaction',
    };

    await channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: reactionMessage,
    });
  };

  return {
    messages,
    sendMessage,
    sendReaction,
  };
};
