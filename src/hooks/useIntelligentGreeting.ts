import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useUserPreferences } from './useUserPreferences';
import { useTextToSpeech } from './useTextToSpeech';
import { useAIConsent } from './useAIConsent';
import { generateGreetingMessage, GreetingContext, GreetingMessage, GreetingMessageType } from '@/services/greetingMessages';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vitana_greeting_spoken';
const LAST_GREETING_KEY = 'vitana_last_greeting_time';

interface GreetingGuards {
  glassModeActive: boolean;
  micActive: boolean;
  sessionReady: boolean;
  hasPendingTTS: boolean;
}

export function useIntelligentGreeting(guards?: GreetingGuards) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { speak, isSpeaking } = useTextToSpeech();
  const { hasConsent } = useAIConsent();
  const [lastGreeting, setLastGreeting] = useState<GreetingMessage | null>(null);
  const [greetingHistory, setGreetingHistory] = useState<Array<{ message: string; time: string }>>([]);
  const activationTimesRef = useRef<number[]>([]);
  const greetingSuppressedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const greetingScheduledRef = useRef(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout>();
  const traceIdRef = useRef(`GREET-${Date.now()}`);

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  };

  const shouldGreet = useCallback((): boolean => {
    const traceId = traceIdRef.current;
    
    if (!hasConsent) {
      console.log(`[GREET][${traceId}] skipped_no_ai_consent`);
      return false;
    }
    if (!preferences?.auto_greeting_enabled) {
      console.log(`[GREET][${traceId}] skipped_auto_greeting_disabled`);
      return false;
    }
    if (!user) {
      console.log(`[GREET][${traceId}] skipped_no_user`);
      return false;
    }

    // CRITICAL: Check all guardrails
    if (guards?.glassModeActive) {
      console.log(`[GREET][${traceId}] suppressed_due_to_glass glassModeActive=${guards.glassModeActive}`);
      return false;
    }
    if (guards?.micActive) {
      console.log(`[GREET][${traceId}] suppressed_due_to_mic micActive=${guards.micActive}`);
      return false;
    }
    if (!guards?.sessionReady) {
      console.log(`[GREET][${traceId}] suppressed_session_not_ready sessionReady=${guards?.sessionReady}`);
      return false;
    }
    if (guards?.hasPendingTTS || isSpeaking) {
      console.log(`[GREET][${traceId}] suppressed_pending_tts hasPendingTTS=${guards?.hasPendingTTS} isSpeaking=${isSpeaking}`);
      return false;
    }

    // Check suppression flag
    if (greetingSuppressedRef.current) {
      console.log(`[GREET][${traceId}] suppressed_by_flag`);
      return false;
    }

    // Check user interaction
    if (userInteractedRef.current) {
      console.log(`[GREET][${traceId}] cancelled_by_user_input`);
      return false;
    }

    const frequency = preferences.greeting_frequency || 'session';
    if (frequency === 'off') {
      console.log(`[GREET][${traceId}] skipped_frequency_off`);
      return false;
    }

    const hasGreeted = sessionStorage.getItem(SESSION_KEY) === 'true';
    const lastGreetingTime = localStorage.getItem(LAST_GREETING_KEY);

    if (frequency === 'session') {
      if (hasGreeted) {
        console.log(`[GREET][${traceId}] skipped_already_greeted`);
        return false;
      }
      return true;
    }

    if (frequency === 'daily' && lastGreetingTime) {
      const lastTime = new Date(lastGreetingTime);
      const now = new Date();
      const isSameDay = lastTime.toDateString() === now.toDateString();
      if (isSameDay) {
        console.log(`[GREET][${traceId}] skipped_already_greeted_today`);
        return false;
      }
      return true;
    }

    if (frequency === 'hourly' && lastGreetingTime) {
      const hoursSince = (Date.now() - new Date(lastGreetingTime).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        console.log(`[GREET][${traceId}] skipped_too_soon hoursSince=${hoursSince.toFixed(1)}`);
        return false;
      }
      return true;
    }

    return !hasGreeted;
  }, [preferences, user, guards, isSpeaking, hasConsent]);

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
    const traceId = traceIdRef.current;
    
    // Single-flight guarantee
    if (greetingScheduledRef.current) {
      console.log(`[GREET][${traceId}] skipped_already_scheduled`);
      return;
    }

    if (!shouldGreet()) return;

    greetingScheduledRef.current = true;
    console.log(`[GREET][${traceId}] scheduled`);

    try {
      console.log(`[GREET][${traceId}] fired timestamp=${new Date().toISOString()}`);
      
      // Get session for Authorization and user_id
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const userId = session?.user?.id;
      
      if (!accessToken || !userId) {
        console.warn(`[GREET][${traceId}] failed NO_AUTH_TOKEN or NO_USER_ID`);
        return;
      }
      
      // Call AI-powered greeting with proper auth, user_id, and language
      const { data, error } = await supabase.functions.invoke('generate-proactive-greeting', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { 
          user_id: userId,
          override_language: preferences?.stt_language || 'en-US' 
        }
      });
      
      if (error) {
        console.error(`[GREET][${traceId}] failed EDGE_FUNCTION_ERROR`, error);
        throw error;
      }
      
      console.log(`[GREET][${traceId}] generated text="${data.greeting?.substring(0, 50)}..."`);
      const greetingMessage = {
        text: data.greeting,
        type: 'ai_generated' as GreetingMessageType,
        priority: 'medium' as const,
        context: data.context
      };
      setLastGreeting(greetingMessage);
      speak(data.greeting);

      sessionStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(LAST_GREETING_KEY, new Date().toISOString());

      const historyEntry = {
        message: data.greeting,
        time: new Date().toISOString()
      };
      setGreetingHistory((prev) => [historyEntry, ...prev].slice(0, 10));
      console.log(`[GREET][${traceId}] completed`);
    } catch (error) {
      console.error(`[GREET][${traceId}] failed ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
      // Don't show error card during Glass Mode
      if (!guards?.glassModeActive) {
        // Error card would be handled by caller if needed
      }
    } finally {
      greetingScheduledRef.current = false;
    }
  }, [shouldGreet, speak, preferences, guards]);

  const manualGreeting = useCallback(async () => {
    try {
      if (!hasConsent) {
        console.log('[GREET] Manual greeting skipped — no AI consent');
        return;
      }

      console.log('🎯 Triggering manual AI greeting...');

      // For audio mode (when mic is active), use a brief contextual greeting
      if (guards?.micActive) {
        console.log('🎤 Audio mode detected - using brief greeting');
        const briefMessage = "I'm listening. How can I help?";
        speak(briefMessage, {
          onStart: () => console.log('🔊 Audio greeting started'),
          onEnd: () => console.log('✅ Audio greeting complete')
        });
        return;
      }
      
      // Get session for Authorization and user_id
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const userId = session?.user?.id;
      
      if (!accessToken || !userId) {
        console.warn('No session token or user_id, skipping greeting');
        return;
      }
      
      // Call AI-powered greeting with proper auth, user_id, and language
      const { data, error } = await supabase.functions.invoke('generate-proactive-greeting', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { 
          user_id: userId,
          override_language: preferences?.stt_language || 'en-US' 
        }
      });
      
      if (error) throw error;
      
      const greetingMessage = {
        text: data.greeting,
        type: 'ai_generated' as GreetingMessageType,
        priority: 'medium' as const,
        context: data.context
      };
      setLastGreeting(greetingMessage);
      speak(data.greeting);

      const historyEntry = {
        message: data.greeting,
        time: new Date().toISOString()
      };
      setGreetingHistory((prev) => [historyEntry, ...prev].slice(0, 10));
    } catch (error) {
      console.error('Failed to trigger manual greeting:', error);
    }
  }, [speak, preferences, guards, hasConsent]);

  const suppressGreeting = useCallback(() => {
    const traceId = traceIdRef.current;
    greetingSuppressedRef.current = true;
    console.log(`[GREET][${traceId}] suppressed_manually`);
  }, []);

  const cancelGreeting = useCallback(() => {
    const traceId = traceIdRef.current;
    userInteractedRef.current = true;
    greetingScheduledRef.current = false;
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = undefined;
    }
    console.log(`[GREET][${traceId}] cancelled_by_user_input`);
  }, []);

  const schedulePostGlassCooldown = useCallback(() => {
    const traceId = traceIdRef.current;
    console.log(`[GREET][${traceId}] cooldown_started`);
    greetingSuppressedRef.current = false; // Allow greeting again after cooldown
    
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    
    cooldownTimerRef.current = setTimeout(() => {
      console.log(`[GREET][${traceId}] cooldown_ended`);
      triggerGreeting();
    }, 5000);
  }, [triggerGreeting]);

  const clearGreetingState = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  return {
    triggerGreeting,
    manualGreeting,
    suppressGreeting,
    cancelGreeting,
    schedulePostGlassCooldown,
    clearGreetingState,
    lastGreeting,
    greetingHistory,
    isSpeaking
  };
}
