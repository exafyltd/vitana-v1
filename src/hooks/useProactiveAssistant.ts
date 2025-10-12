import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTextToSpeech } from './useTextToSpeech';
import { useToast } from '@/hooks/use-toast';

interface ProactiveMessage {
  id: string;
  text: string;
  type: 'greeting' | 'reminder' | 'guidance' | 'encouragement' | 'suggestion' | 'check-in';
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export function useProactiveAssistant() {
  const [messageHistory, setMessageHistory] = useState<ProactiveMessage[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { speak, isSpeaking } = useTextToSpeech();
  const { toast } = useToast();

  const getMessageIcon = (type: ProactiveMessage['type']) => {
    const icons = {
      greeting: '👋',
      reminder: '🎯',
      guidance: '💡',
      encouragement: '🎉',
      suggestion: '✨',
      'check-in': '💭',
    };
    return icons[type] || '✨';
  };

  const triggerProactiveMessage = useCallback(async () => {
    // Rate limiting: max 1 message per 30 seconds
    if (lastMessageTime) {
      const secondsSinceLast = (Date.now() - lastMessageTime.getTime()) / 1000;
      if (secondsSinceLast < 30) {
        toast({
          title: "Please wait",
          description: `You can request another message in ${Math.ceil(30 - secondsSinceLast)} seconds.`,
          variant: "default",
        });
        return;
      }
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-proactive-message');

      if (error) throw error;

      const message: ProactiveMessage = {
        id: crypto.randomUUID(),
        text: data.message,
        type: data.messageType,
        priority: data.priority,
        timestamp: new Date(),
      };

      // Update history
      setMessageHistory(prev => [message, ...prev].slice(0, 10));
      setLastMessageTime(new Date());

      // Speak the message
      speak(message.text, {
        onError: (error) => {
          console.error('TTS error:', error);
        }
      });

      // Show toast notification
      toast({
        title: `${getMessageIcon(message.type)} ${message.type.charAt(0).toUpperCase() + message.type.slice(1)}`,
        description: message.text,
        duration: 8000,
      });

      console.log('✅ Proactive message delivered:', message);

    } catch (error) {
      console.error('Error generating proactive message:', error);
      toast({
        title: "Unable to generate message",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [lastMessageTime, speak, toast]);

  const replayLastMessage = useCallback(() => {
    if (messageHistory.length > 0 && !isSpeaking) {
      const lastMessage = messageHistory[0];
      speak(lastMessage.text);
      
      toast({
        title: `${getMessageIcon(lastMessage.type)} Replaying`,
        description: lastMessage.text,
        duration: 5000,
      });
    }
  }, [messageHistory, isSpeaking, speak, toast]);

  return {
    triggerProactiveMessage,
    replayLastMessage,
    messageHistory,
    isGenerating,
    isSpeaking,
    canGenerate: !lastMessageTime || (Date.now() - lastMessageTime.getTime()) / 1000 >= 30,
  };
}
