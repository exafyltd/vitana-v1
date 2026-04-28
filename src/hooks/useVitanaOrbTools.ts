import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlassMode } from './useGlassMode';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useToast } from './use-toast';
import { useTranslation } from './useTranslation';

interface ToolCall {
  functionCalls?: Array<{
    name: string;
    args?: Record<string, any>;
    id: string;
  }>;
}

interface UseVitanaOrbToolsOptions {
  onDiaryOpen?: () => void;
  onAutopilotOpen?: () => void;
}

export const useVitanaOrbTools = (options: UseVitanaOrbToolsOptions = {}) => {
  const navigate = useNavigate();
  const glassMode = useGlassMode();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const {
    setGlassModeActive,
    setCameraActive,
    setDiaryActive,
    setAutopilotActive,
    setTextInputVisible,
    cameraActive,
  } = useStreamingState();

  // Front-end navigation command mapping
  const navigateByCommand = useCallback((text: string): boolean => {
    const t = text.toLowerCase();
    const navTo = translate('navigation.navigatingTo');
    
    // Health & Trackers
    if (t.includes('hydration tracker') || t.includes('water tracker')) {
      navigate('/health/tracker/hydration');
      toast({ title: `${navTo} ${translate('navigation.hydrationTracker')}` });
      return true;
    }
    if (t.includes('sleep tracker') || t.includes('sleep')) {
      navigate('/health/tracker/sleep');
      toast({ title: `${navTo} ${translate('navigation.sleepTracker')}` });
      return true;
    }
    if (t.includes('nutrition') || t.includes('food tracker')) {
      navigate('/health/tracker/nutrition');
      toast({ title: `${navTo} ${translate('navigation.nutritionTracker')}` });
      return true;
    }
    if (t.includes('workout') || t.includes('exercise') || t.includes('fitness')) {
      navigate('/health/tracker/workout');
      toast({ title: `${navTo} ${translate('navigation.workoutTracker')}` });
      return true;
    }
    if (t.includes('biomarkers') || t.includes('blood work')) {
      navigate('/health/biomarkers');
      toast({ title: `${navTo} ${translate('navigation.biomarkers')}` });
      return true;
    }
    
    // Community & Social
    if (t.includes('calendar') || t.includes('events')) {
      navigate('/calendar');
      toast({ title: `${navTo} ${translate('navigation.calendar')}` });
      return true;
    }
    if (t.includes('community') || t.includes('feed')) {
      navigate('/community');
      toast({ title: `${navTo} ${translate('navigation.community')}` });
      return true;
    }
    if (t.includes('groups') || t.includes('my groups')) {
      navigate('/groups');
      toast({ title: `${navTo} ${translate('navigation.groups')}` });
      return true;
    }
    if (t.includes('messages') || t.includes('inbox') || t.includes('chat')) {
      navigate('/inbox');
      toast({ title: `${navTo} ${translate('navigation.messages')}` });
      return true;
    }
    
    // Wellness & Discover
    if (t.includes('wellness') || t.includes('discover')) {
      navigate('/discover');
      toast({ title: `${navTo} ${translate('navigation.discover')}` });
      return true;
    }
    if (t.includes('supplements')) {
      navigate('/discover/supplements');
      toast({ title: `${navTo} ${translate('navigation.supplements')}` });
      return true;
    }
    
    // Personal
    if (t.includes('wallet') || t.includes('payment')) {
      navigate('/wallet');
      toast({ title: `${navTo} ${translate('navigation.wallet')}` });
      return true;
    }
    // My Journey → Autopilot Dashboard (90-day journey prepared by Autopilot, aligned to the Calendar)
    if (
      t.includes('my journey') ||
      t.includes('meine reise') ||
      t.includes('autopilot journey') ||
      t.includes('90-day journey') ||
      t.includes('90 day journey') ||
      t.includes('journey')
    ) {
      navigate('/autopilot');
      toast({ title: `${navTo} ${translate('navigation.myJourney')}` });
      return true;
    }
    if (t.includes('profile') || t.includes('my profile')) {
      navigate('/profile');
      toast({ title: `${navTo} ${translate('navigation.profile')}` });
      return true;
    }
    if (t.includes('settings')) {
      navigate('/settings');
      toast({ title: `${navTo} ${translate('navigation.settings')}` });
      return true;
    }
    if (t.includes('diary') || t.includes('journal')) {
      navigate('/memory/diary');
      toast({ title: `${navTo} ${translate('navigation.diary')}` });
      return true;
    }
    
    // Longevity News → News Feed (VTID-01900: Home is the standalone News Feed)
    if (
      t.includes('longevity news') ||
      t.includes('latest news') ||
      t.includes('news feed') ||
      t.includes('news')
    ) {
      navigate('/home');
      toast({ title: `${navTo} ${translate('navigation.news')}` });
      return true;
    }

    // Home
    if (t.includes('home') || t.includes('dashboard')) {
      navigate('/home');
      toast({ title: `${navTo} ${translate('navigation.home')}` });
      return true;
    }
    
    return false; // No match found
  }, [navigate, toast, translate]);

  const executeToolCall = useCallback(async (toolCall: ToolCall) => {
    if (!toolCall.functionCalls || toolCall.functionCalls.length === 0) {
      return;
    }

    console.log('[VITANA Tools] Executing tool calls:', toolCall.functionCalls);

    for (const call of toolCall.functionCalls) {
      try {
        console.log(`[VITANA Tools] Executing: ${call.name}`);

        // Check for navigation commands first
        if (call.name === 'navigate_to') {
          const destination = call.args?.destination || '';
          if (navigateByCommand(destination)) {
            console.log(`[VITANA Tools] ✅ Navigated to: ${destination}`);
            continue;
          }
        }

        // VTID-DANCE-D14: structured navigation targets from gateway voice tool.
        if (call.name === 'navigate_to_screen') {
          const target = String(call.args?.target || '');
          const intentId = call.args?.intent_id ? String(call.args.intent_id) : null;
          const matchId = call.args?.match_id ? String(call.args.match_id) : null;
          const TARGET_TO_PATH: Record<string, string> = {
            my_intents: '/intents/mine',
            intent_board: '/intents/board',
            intent_board_dance: '/intents/board?filter=dance',
            open_asks: '/comm/open-asks',
            members: '/comm/members',
            edit_dance_preferences: '/profile/edit?drawer=dance',
            events_meetups: '/comm/events-meetups',
            community_feed: '/comm/feed',
          };
          let path = TARGET_TO_PATH[target] || null;
          if (target === 'intent_match_detail' && matchId) path = `/intents/match/${matchId}`;
          if (target === 'intent_post_public' && intentId) path = `/p/${intentId}`;
          if (path) {
            navigate(path);
            toast({ title: `Opening: ${target.replace(/_/g, ' ')}` });
            console.log(`[VITANA Tools] ✅ navigate_to_screen → ${path}`);
            continue;
          }
          console.warn(`[VITANA Tools] navigate_to_screen unknown target: ${target}`);
        }

        switch (call.name) {
          case 'start_glass_mode':
            toast({
              title: translate('glassMode.screenSharingComingSoon'),
              description: translate('glassMode.screenSharingDesc'),
              duration: 3000,
            });
            break;

          case 'stop_glass_mode':
            glassMode.stopGlassMode();
            setGlassModeActive(false);
            toast({
              title: translate('glassMode.screenSharingStopped'),
              description: translate('glassMode.glassModeDisabled'),
              duration: 2000,
            });
            break;

          case 'start_camera_mode':
            toast({
              title: translate('glassMode.cameraModeComingSoon'),
              description: translate('glassMode.cameraModeDesc'),
              duration: 3000,
            });
            break;

          case 'open_diary_entry':
            setDiaryActive(true);
            options.onDiaryOpen?.();
            toast({
              title: translate('glassMode.diaryReady'),
              description: translate('glassMode.openingDiary'),
              duration: 2000,
            });
            break;

          case 'run_autopilot':
            setAutopilotActive(true);
            options.onAutopilotOpen?.();
            toast({
              title: translate('glassMode.autopilotActivated'),
              description: translate('glassMode.runningAutopilot'),
              duration: 2000,
            });
            break;

          case 'show_text_input':
            setTextInputVisible(true);
            toast({
              title: translate('glassMode.textInputReady'),
              description: translate('glassMode.typeMessage'),
              duration: 2000,
            });
            break;

          case 'navigate_to':
            // Phase 1: Conversational only - no actual navigation yet
            console.log('[VITANA Tools] Navigate to:', call.args?.destination);
            // AI will respond conversationally with directions
            break;

          default:
            console.warn('[VITANA Tools] Unknown tool:', call.name);
        }

        console.log(`[VITANA Tools] ✅ ${call.name} executed successfully`);
      } catch (error) {
        console.error(`[VITANA Tools] ❌ Error executing ${call.name}:`, error);
        toast({
          title: translate('glassMode.actionFailed'),
          description: translate('glassMode.couldNotExecute').replace('{action}', call.name),
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  }, [glassMode, setGlassModeActive, setCameraActive, setDiaryActive, setAutopilotActive, setTextInputVisible, cameraActive, options, toast, navigateByCommand, translate]);

  return {
    executeToolCall,
    navigateByCommand, // Expose for direct use in text input
  };
};
