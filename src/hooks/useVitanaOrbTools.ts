import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlassMode } from './useGlassMode';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useToast } from './use-toast';

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
    
    // Health & Trackers
    if (t.includes('hydration tracker') || t.includes('water tracker')) {
      navigate('/health/tracker/hydration');
      toast({ title: "Navigating to Hydration Tracker" });
      return true;
    }
    if (t.includes('sleep tracker') || t.includes('sleep')) {
      navigate('/health/tracker/sleep');
      toast({ title: "Navigating to Sleep Tracker" });
      return true;
    }
    if (t.includes('nutrition') || t.includes('food tracker')) {
      navigate('/health/tracker/nutrition');
      toast({ title: "Navigating to Nutrition Tracker" });
      return true;
    }
    if (t.includes('workout') || t.includes('exercise') || t.includes('fitness')) {
      navigate('/health/tracker/workout');
      toast({ title: "Navigating to Workout Tracker" });
      return true;
    }
    if (t.includes('biomarkers') || t.includes('blood work')) {
      navigate('/health/biomarkers');
      toast({ title: "Navigating to Biomarkers" });
      return true;
    }
    
    // Community & Social
    if (t.includes('calendar') || t.includes('events')) {
      navigate('/calendar');
      toast({ title: "Navigating to Calendar" });
      return true;
    }
    if (t.includes('community') || t.includes('feed')) {
      navigate('/community');
      toast({ title: "Navigating to Community" });
      return true;
    }
    if (t.includes('groups') || t.includes('my groups')) {
      navigate('/groups');
      toast({ title: "Navigating to Groups" });
      return true;
    }
    if (t.includes('messages') || t.includes('inbox') || t.includes('chat')) {
      navigate('/inbox');
      toast({ title: "Navigating to Messages" });
      return true;
    }
    
    // Wellness & Discover
    if (t.includes('wellness') || t.includes('discover')) {
      navigate('/discover');
      toast({ title: "Navigating to Discover" });
      return true;
    }
    if (t.includes('supplements')) {
      navigate('/discover/supplements');
      toast({ title: "Navigating to Supplements" });
      return true;
    }
    
    // Personal
    if (t.includes('wallet') || t.includes('payment')) {
      navigate('/wallet');
      toast({ title: "Navigating to Wallet" });
      return true;
    }
    if (t.includes('profile') || t.includes('my profile')) {
      navigate('/profile');
      toast({ title: "Navigating to Your Profile" });
      return true;
    }
    if (t.includes('settings')) {
      navigate('/settings');
      toast({ title: "Navigating to Settings" });
      return true;
    }
    if (t.includes('diary') || t.includes('journal')) {
      navigate('/memory/diary');
      toast({ title: "Navigating to Diary" });
      return true;
    }
    
    // Home
    if (t.includes('home') || t.includes('dashboard')) {
      navigate('/home');
      toast({ title: "Navigating to Home" });
      return true;
    }
    
    return false; // No match found
  }, [navigate, toast]);

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

        switch (call.name) {
          case 'start_glass_mode':
            toast({
              title: "🖥️ Screen Sharing Coming Soon",
              description: "Share your screen with VITANA for contextual assistance.",
              duration: 3000,
            });
            break;

          case 'stop_glass_mode':
            glassMode.stopGlassMode();
            setGlassModeActive(false);
            toast({
              title: "Screen Sharing Stopped",
              description: "Glass mode disabled",
              duration: 2000,
            });
            break;

          case 'start_camera_mode':
            toast({
              title: "📹 Camera Mode Coming Soon",
              description: "Vision-based AI interactions will be available in the next update.",
              duration: 3000,
            });
            break;

          case 'open_diary_entry':
            setDiaryActive(true);
            options.onDiaryOpen?.();
            toast({
              title: "Diary Ready",
              description: "Opening diary entry",
              duration: 2000,
            });
            break;

          case 'run_autopilot':
            setAutopilotActive(true);
            options.onAutopilotOpen?.();
            toast({
              title: "Autopilot Activated",
              description: "Running autopilot mode",
              duration: 2000,
            });
            break;

          case 'show_text_input':
            setTextInputVisible(true);
            toast({
              title: "Text Input Ready",
              description: "You can now type your message",
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
          title: "Action Failed",
          description: `Could not execute ${call.name}`,
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  }, [glassMode, setGlassModeActive, setCameraActive, setDiaryActive, setAutopilotActive, setTextInputVisible, cameraActive, options, toast, navigateByCommand]);

  return {
    executeToolCall,
    navigateByCommand, // Expose for direct use in text input
  };
};
