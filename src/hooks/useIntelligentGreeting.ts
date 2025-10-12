import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useUserPreferences } from './useUserPreferences';
import { useTextToSpeech } from './useTextToSpeech';
import { generateGreetingMessage, GreetingContext, GreetingMessage, GreetingMessageType } from '@/services/greetingMessages';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vitana_greeting_spoken';
const LAST_GREETING_KEY = 'vitana_last_greeting_time';

export function useIntelligentGreeting() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { speak, isSpeaking } = useTextToSpeech();
  const [lastGreeting, setLastGreeting] = useState<GreetingMessage | null>(null);
  const [greetingHistory, setGreetingHistory] = useState<Array<{ message: string; time: string }>>([]);
  const activationTimesRef = useRef<number[]>([]);

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  };

  const shouldGreet = useCallback((): boolean => {
    if (!preferences?.auto_greeting_enabled) return false;
    if (!user) return false;

    const frequency = preferences.greeting_frequency || 'session';

    if (frequency === 'off') return false;

    const hasGreeted = sessionStorage.getItem(SESSION_KEY) === 'true';
    const lastGreetingTime = localStorage.getItem(LAST_GREETING_KEY);

    if (frequency === 'session') {
      return !hasGreeted;
    }

    if (frequency === 'daily' && lastGreetingTime) {
      const lastTime = new Date(lastGreetingTime);
      const now = new Date();
      const isSameDay = lastTime.toDateString() === now.toDateString();
      return !isSameDay;
    }

    if (frequency === 'hourly' && lastGreetingTime) {
      const hoursSince = (Date.now() - new Date(lastGreetingTime).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 4;
    }

    return !hasGreeted;
  }, [preferences, user]);

  // Canonicalize language code (sr, sr-RS, sr_RS → sr-RS)
  const canonicalizeLang = useCallback((l: string): string => {
    if (!l) return '';
    const normalized = l.toLowerCase().replace('_', '-');
    const parts = normalized.split('-');
    if (parts.length === 1) {
      // Just language code like "sr" → "sr-RS" (use uppercase country code)
      const countryMap: Record<string, string> = {
        'sr': 'RS', 'ar': 'XA', 'en': 'US', 'de': 'DE', 'es': 'ES',
        'ru': 'RU', 'zh': 'CN', 'fr': 'FR', 'pt': 'PT'
      };
      const country = countryMap[parts[0]] || parts[0].toUpperCase();
      return `${parts[0]}-${country}`;
    }
    // Already has country code → normalize to xx-XX format
    return `${parts[0]}-${parts[1].toUpperCase()}`;
  }, []);

  const fetchGreetingContext = useCallback(async (): Promise<GreetingContext> => {
    const timeOfDay = getTimeOfDay();
    const firstName = user?.user_metadata?.first_name;
    
    // Extract language from voice
    const voiceLang = (() => {
      const v = preferences?.tts_voice || '';
      const m = v.match(/([a-z]{2}-[A-Z]{2})/);
      return m?.[1];
    })();
    
    // Canonicalize: prefer stt_language, fallback to voice language
    const rawLanguage = preferences?.stt_language || voiceLang || 'en-US';
    const language = canonicalizeLang(rawLanguage);
    
    console.log('🔍 fetchGreetingContext - stt:', preferences?.stt_language, 'voice:', preferences?.tts_voice, 'voiceLang:', voiceLang, 'canonical language:', language);

    const context: GreetingContext = {
      firstName,
      timeOfDay,
      language
    };

    // Fetch pending actions count (simple query)
    try {
      const { count } = await supabase
        .from('user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);
      
      // We're just checking if preferences exist as a simple async operation
      // In a real implementation, you'd fetch actual autopilot actions here
    } catch (error) {
      console.warn('Failed to fetch greeting context:', error);
    }

    return context;
  }, [user]);

  const triggerGreeting = useCallback(async () => {
    if (!shouldGreet()) return;

    try {
      console.log('🎯 Triggering AI-powered greeting...');
      
      // Call new AI-powered greeting generation
      const { data, error } = await supabase.functions.invoke('generate-proactive-greeting');
      
      if (error) {
        console.error('Error generating AI greeting:', error);
        // Fallback to old method
        const baseContext = await fetchGreetingContext();
        const greetingMessage = generateGreetingMessage(baseContext);
        setLastGreeting(greetingMessage);
        speak(greetingMessage.text);
      } else {
        console.log('📝 Generated AI greeting:', data.greeting);
        const greetingMessage = {
          text: data.greeting,
          type: 'ai_generated' as GreetingMessageType,
          priority: 'medium' as const,
          context: data.context
        };
        setLastGreeting(greetingMessage);
        speak(data.greeting);
      }

      sessionStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(LAST_GREETING_KEY, new Date().toISOString());

      const historyEntry = {
        message: data?.greeting || 'Greeting generated',
        time: new Date().toISOString()
      };
      setGreetingHistory((prev) => [historyEntry, ...prev].slice(0, 10));
    } catch (error) {
      console.error('Failed to trigger greeting:', error);
    }
  }, [shouldGreet, fetchGreetingContext, speak]);

  const manualGreeting = useCallback(async () => {
    try {
      console.log('🎯 Triggering manual AI greeting...');
      
      // Call AI-powered greeting generation
      const { data, error } = await supabase.functions.invoke('generate-proactive-greeting');
      
      if (error) {
        console.error('Error generating AI greeting:', error);
        // Fallback
        const baseContext = await fetchGreetingContext();
        const greetingMessage = generateGreetingMessage(baseContext);
        setLastGreeting(greetingMessage);
        speak(greetingMessage.text);
      } else {
        const greetingMessage = {
          text: data.greeting,
          type: 'ai_generated' as GreetingMessageType,
          priority: 'medium' as const,
          context: data.context
        };
        setLastGreeting(greetingMessage);
        speak(data.greeting);
      }

      const historyEntry = {
        message: data?.greeting || 'Greeting generated',
        time: new Date().toISOString()
      };
      setGreetingHistory((prev) => [historyEntry, ...prev].slice(0, 10));
    } catch (error) {
      console.error('Failed to trigger manual greeting:', error);
    }
  }, [fetchGreetingContext, speak]);

  const clearGreetingState = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return {
    triggerGreeting,
    manualGreeting,
    clearGreetingState,
    lastGreeting,
    greetingHistory,
    isSpeaking
  };
}
