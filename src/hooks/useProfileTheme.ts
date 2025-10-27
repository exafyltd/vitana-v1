import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export type ProfileTheme = 'serenity' | 'focus' | 'expression';

export interface ThemeConfig {
  name: ProfileTheme;
  displayName: string;
  icon: string;
  card: {
    background: string;
    overlay: string;
    border: string;
    shadow: string;
  };
  avatar: {
    border: string;
    glow: string;
    rings: string[];
  };
  text: {
    name: string;
    handle: string;
    bio: string;
  };
  vitanaOrb: {
    background: string;
    border: string;
    glow: string;
    text: string;
  };
  badge: {
    background: string;
    text: string;
    glow: string;
  };
  buttons: {
    primary: string;
    secondary: string;
  };
  backCard: {
    borderGradient: string;
    accentGlow: string;
    topStripe: string;
    platformHoverGlow: string;
    darkBase?: string;
    leftEdgeGlow?: string;
    textHeader?: string;
    textInactive?: string;
    lightBase?: string;
    lightShadow?: string;
    lightBorderOpacity?: string;
    dividerColor?: string;
  };
}

export const THEME_CONFIGS: Record<ProfileTheme, ThemeConfig> = {
  // Serenity & Expression are concept references only - not active
  serenity: {
    name: 'serenity',
    displayName: 'Serenity (Concept)',
    icon: '🌅',
    card: {
      background: 'linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)',
      overlay: 'bg-transparent',
      border: 'border-white/5',
      shadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
    },
    avatar: {
      border: 'border-[3px] border-white/10',
      glow: 'from-sky-500/15 via-indigo-500/12 to-transparent',
      rings: ['border-sky-500/20', 'border-indigo-500/15'],
    },
    text: {
      name: 'text-[hsl(210,20%,96%)]',
      handle: 'text-[hsl(210,20%,80%)]',
      bio: 'text-[hsl(210,20%,70%)]',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(199, 60%, 48%) 0%, hsl(239, 60%, 67%) 100%)',
      border: 'from-white/20 to-white/10',
      glow: 'from-sky-500/20 via-indigo-500/15 to-transparent',
      text: 'text-white',
    },
    badge: {
      background: 'bg-white/10',
      text: 'text-[hsl(210,20%,96%)]',
      glow: 'from-sky-500/15 to-indigo-500/15',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-[hsl(199,60%,48%)] to-[hsl(239,60%,67%)] hover:from-[hsl(199,60%,40%)] hover:to-[hsl(239,60%,60%)]',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/10',
    },
    backCard: {
      borderGradient: 'from-sky-500/20 via-indigo-500/15 to-transparent',
      accentGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.1)]',
      topStripe: 'bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-sky-500/20',
      platformHoverGlow: 'hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]',
      darkBase: 'bg-white/5',
      textHeader: 'text-[hsl(210,20%,96%)]',
      textInactive: 'text-[hsl(210,20%,70%)]',
      dividerColor: 'from-white/10',
    },
  },
  // Focus is the EXCLUSIVE active theme
  focus: {
    name: 'focus',
    displayName: 'Focus',
    icon: '🌓',
    card: {
      background: 'linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)',
      overlay: 'bg-transparent',
      border: 'border-white/5',
      shadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
    },
    avatar: {
      border: 'border-[3px] border-white/10',
      glow: 'from-[hsl(199,36%,48%)]/8 via-[hsl(239,36%,67%)]/6 to-transparent',
      rings: ['border-[hsl(199,36%,48%)]/10', 'border-[hsl(239,36%,67%)]/8'],
    },
    text: {
      name: 'text-[hsl(210,20%,96%)]',
      handle: 'text-[hsl(210,20%,80%)]',
      bio: 'text-[hsl(210,20%,70%)]',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(199, 36%, 48%) 0%, hsl(239, 36%, 67%) 100%)',
      border: 'from-white/20 to-white/10',
      glow: 'from-[hsl(199,36%,48%)]/8 via-[hsl(239,36%,67%)]/6 to-transparent',
      text: 'text-white',
    },
    badge: {
      background: 'bg-white/10',
      text: 'text-[hsl(210,20%,96%)]',
      glow: 'from-[hsl(199,36%,48%)]/8 to-[hsl(239,36%,67%)]/8',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-[hsl(199,36%,48%)] to-[hsl(239,36%,67%)] hover:from-[hsl(199,36%,42%)] hover:to-[hsl(239,36%,60%)] shadow-[0_4px_12px_rgba(14,165,233,0.15)]',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/10',
    },
    backCard: {
      borderGradient: 'from-[hsl(199,36%,48%)]/8 via-[hsl(239,36%,67%)]/6 to-transparent',
      accentGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.08)]',
      topStripe: 'bg-gradient-to-r from-[hsl(199,36%,48%)]/8 via-[hsl(239,36%,67%)]/8 to-[hsl(199,36%,48%)]/8',
      platformHoverGlow: 'hover:shadow-[0_0_15px_rgba(14,165,233,0.1)]',
      darkBase: 'bg-white/5',
      leftEdgeGlow: 'bg-gradient-to-r from-[hsl(199,36%,48%)]/6 to-transparent',
      textHeader: 'text-[hsl(210,20%,96%)]',
      textInactive: 'text-[hsl(210,20%,70%)]',
      dividerColor: 'from-[hsl(199,36%,48%)]/8',
    },
  },
  // Expression is a concept reference only - not active
  expression: {
    name: 'expression',
    displayName: 'Expression (Concept)',
    icon: '💎',
    card: {
      background: 'linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)',
      overlay: 'bg-transparent',
      border: 'border-white/5',
      shadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
    },
    avatar: {
      border: 'border-[3px] border-white/10',
      glow: 'from-sky-500/15 via-indigo-500/12 to-transparent',
      rings: ['border-sky-500/20', 'border-indigo-500/15'],
    },
    text: {
      name: 'text-[hsl(210,20%,96%)]',
      handle: 'text-[hsl(210,20%,80%)]',
      bio: 'text-[hsl(210,20%,70%)]',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(199, 60%, 48%) 0%, hsl(239, 60%, 67%) 100%)',
      border: 'from-white/20 to-white/10',
      glow: 'from-sky-500/20 via-indigo-500/15 to-transparent',
      text: 'text-white',
    },
    badge: {
      background: 'bg-white/10',
      text: 'text-[hsl(210,20%,96%)]',
      glow: 'from-sky-500/15 to-indigo-500/15',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-[hsl(199,60%,48%)] to-[hsl(239,60%,67%)] hover:from-[hsl(199,60%,40%)] hover:to-[hsl(239,60%,60%)]',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/10',
    },
    backCard: {
      borderGradient: 'from-sky-500/20 via-indigo-500/15 to-transparent',
      accentGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.1)]',
      topStripe: 'bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-sky-500/20',
      platformHoverGlow: 'hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]',
      darkBase: 'bg-white/5',
      textHeader: 'text-[hsl(210,20%,96%)]',
      textInactive: 'text-[hsl(210,20%,70%)]',
      dividerColor: 'from-white/10',
    },
  },
};

export function useProfileTheme(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Focus is the exclusive active theme - always default to 'focus'
  const [theme, setThemeState] = useState<ProfileTheme>('focus');
  const [loading, setLoading] = useState(true);

  // Load theme from database and subscribe to real-time updates
  useEffect(() => {
    const loadTheme = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', userId)
          .single();

        if (!error && data?.theme) {
          setThemeState(data.theme as ProfileTheme);
        }
      } catch (err) {
        console.error('Error loading theme:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();

    // Subscribe to real-time theme changes
    if (userId) {
      const channel = supabase
        .channel(`profile-theme-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new?.theme) {
              setThemeState(payload.new.theme as ProfileTheme);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const setTheme = async (newTheme: ProfileTheme) => {
    // Focus is the exclusive theme - lock all attempts to 'focus'
    const forcedTheme = 'focus';
    
    if (!user || !userId || user.id !== userId) {
      console.warn('Unauthorized theme change attempt');
      return;
    }

    // Always set to Focus
    setThemeState(forcedTheme);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme: forcedTheme })
        .eq('user_id', userId);

      if (error) {
        console.error('Error saving theme:', error);
      }
    } catch (err) {
      console.error('Error updating theme:', err);
    }
  };

  // Cycle function disabled - Focus is exclusive
  const cycleTheme = () => {
    // No-op: Focus theme is locked as exclusive
    console.log('Theme cycling disabled - Focus is the exclusive theme');
  };

  return {
    theme,
    themeConfig: THEME_CONFIGS[theme],
    setTheme,
    cycleTheme,
    loading,
  };
}
