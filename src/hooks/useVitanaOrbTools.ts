import { useCallback } from 'react';
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

  const executeToolCall = useCallback(async (toolCall: ToolCall) => {
    if (!toolCall.functionCalls || toolCall.functionCalls.length === 0) {
      return;
    }

    console.log('[VITANA Tools] Executing tool calls:', toolCall.functionCalls);

    for (const call of toolCall.functionCalls) {
      try {
        console.log(`[VITANA Tools] Executing: ${call.name}`);

        switch (call.name) {
          case 'start_glass_mode':
            await glassMode.startGlassMode();
            setGlassModeActive(true);
            toast({
              title: "Screen Sharing Active",
              description: "Glass mode enabled",
              duration: 2000,
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
            // Toggle camera
            if (cameraActive) {
              setCameraActive(false);
              toast({
                title: "Camera Off",
                description: "Camera deactivated",
                duration: 2000,
              });
            } else {
              // Request camera permission
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Store stream reference if needed for display
                setCameraActive(true);
                toast({
                  title: "Camera Active",
                  description: "Camera is now on",
                  duration: 2000,
                });
              } catch (err) {
                toast({
                  title: "Camera Access Denied",
                  description: "Please enable camera permissions",
                  variant: "destructive",
                  duration: 3000,
                });
              }
            }
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
  }, [glassMode, setGlassModeActive, setCameraActive, setDiaryActive, setAutopilotActive, setTextInputVisible, cameraActive, options, toast]);

  return {
    executeToolCall,
  };
};
