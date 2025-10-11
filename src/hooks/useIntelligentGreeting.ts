import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useUserPreferences } from './useUserPreferences';
import { useTextToSpeech } from './useTextToSpeech';
import { generateGreetingMessage, GreetingContext, GreetingMessage } from '@/services/greetingMessages';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vitana_greeting_spoken';
const LAST_GREETING_KEY = 'vitana_last_greeting_time';

export function useIntelligentGreeting() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { speak, isSpeaking } = useTextToSpeech();
  const [lastGreeting, setLastGreeting] = useState<GreetingMessage | null>(null);
  const [greetingHistory, setGreetingHistory] = useState<Array<{ message: string; time: string }>>([]);

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

  const fetchGreetingContext = useCallback(async (): Promise<GreetingContext> => {
    const timeOfDay = getTimeOfDay();
    const firstName = user?.user_metadata?.first_name;

    const context: GreetingContext = {
      firstName,
      timeOfDay,
      language: preferences?.stt_language || 'en-US'
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
      const context = await fetchGreetingContext();
      const greetingMessage = generateGreetingMessage(context);

      // Filter message types based on user preferences
      const allowedTypes = preferences?.greeting_message_types || ['welcome', 'reminder', 'motivation'];
      if (!allowedTypes.includes(greetingMessage.type)) {
        // Fallback to simple welcome if type not allowed - regenerate with same context but force welcome type
        const welcomeContext = { ...context, pendingActions: undefined, upcomingAppointments: undefined, healthScoreChange: undefined, achievements: undefined };
        const simpleGreeting = generateGreetingMessage(welcomeContext);
        setLastGreeting(simpleGreeting);
        speak(simpleGreeting.text);
      } else {
        setLastGreeting(greetingMessage);
        speak(greetingMessage.text);
      }

      // Mark as greeted
      sessionStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(LAST_GREETING_KEY, new Date().toISOString());

      // Add to history
      const historyEntry = {
        message: greetingMessage.text,
        time: new Date().toISOString()
      };
      setGreetingHistory(prev => [historyEntry, ...prev].slice(0, 10));

    } catch (error) {
      console.error('Failed to trigger greeting:', error);
    }
  }, [shouldGreet, fetchGreetingContext, preferences, speak]);

  const manualGreeting = useCallback(async () => {
    const context = await fetchGreetingContext();
    const greetingMessage = generateGreetingMessage(context);
    setLastGreeting(greetingMessage);
    speak(greetingMessage.text);

    const historyEntry = {
      message: greetingMessage.text,
      time: new Date().toISOString()
    };
    setGreetingHistory(prev => [historyEntry, ...prev].slice(0, 10));
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
