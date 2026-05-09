import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTextToSpeech } from './useTextToSpeech';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAIConsent } from '@/hooks/useAIConsent';
import { notify, notifyError } from '@/lib/i18n-toast';
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
  const { selectedLanguage } = useLanguage();
  const { hasConsent } = useAIConsent();
  
  // Log when selectedLanguage changes
  useEffect(() => {
    console.log('[LANG-TIMING] 3️⃣ useProactiveAssistant hook updated:', new Date().toISOString(), selectedLanguage);
  }, [selectedLanguage]);
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
    // Gate on AI consent
    if (!hasConsent) {
      console.log('[ProactiveAssistant] No AI consent — skipping');
      notify('toasts.hooks.aiConsentRequired', 'toasts.hooks.pleaseGrantAiDataSharingConsent');
      return;
    }

    // Try to get session (optional)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session detected, generating a generic proactive message (guest mode).');
    } else {
      console.log('🔐 User authenticated, session valid until:', new Date(session.expires_at! * 1000));
    }

    // Rate limiting: max 1 message per 30 seconds
    if (lastMessageTime) {
      const secondsSinceLast = (Date.now() - lastMessageTime.getTime()) / 1000;
      if (secondsSinceLast < 30) {
        notify('toasts.hooks.pleaseWait');
        return;
      }
    }

    setIsGenerating(true);

    try {
const accessToken = session?.access_token;
      console.log('[LANG-TIMING] 4️⃣ Sending to edge function:', new Date().toISOString(), selectedLanguage);
      const { data, error } = await supabase.functions.invoke('generate-proactive-message', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: { override_language: selectedLanguage },
      });

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
      const anyErr = error as any;
      const serverMsg = anyErr?.context?.error || anyErr?.message || String(error);
      const msg = typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg);

      if (msg.includes('Rate limits') || anyErr?.status === 429) {
        notifyError('toasts.hooks.rateLimitReached2', 'toasts.hooks.pleaseWaitFewSecondsTryAgain');
      } else if (msg.includes('Payment required') || anyErr?.status === 402) {
        notifyError('toasts.hooks.aiUsageLimit', 'toasts.hooks.pleaseAddCreditsLovableAiWorkspace');
      } else if (msg.includes('Authentication') || msg.includes('JWT') || msg.toLowerCase().includes('auth')) {
        notifyError('toasts.hooks.sessionNotDetected', 'toasts.hooks.logForPersonalizedTipsShowingGeneric');
      } else if (msg.includes('LOVABLE_API_KEY')) {
        notifyError('toasts.hooks.configurationError', 'toasts.hooks.aiServiceNotConfiguredPleaseContact');
      } else {
        notifyError('toasts.hooks.unableGenerateMessage');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [lastMessageTime, speak, toast, selectedLanguage, hasConsent]);

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
