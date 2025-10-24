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
  serenity: {
    name: 'serenity',
    displayName: 'Serenity',
    icon: '🌅',
    card: {
      background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.8) 50%, rgba(224,242,254,0.5) 100%)',
      overlay: 'bg-[radial-gradient(ellipse_at_top,hsl(173,70%,85%)/12_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,hsl(210,90%,75%)/8_0%,transparent_50%)]',
      border: 'border-teal-200/60 dark:border-teal-800/60',
      shadow: 'shadow-[0_30px_80px_rgba(20,184,166,0.08),0_10px_30px_rgba(56,189,248,0.06),inset_0_1px_0_rgba(255,255,255,0.4)]',
    },
    avatar: {
      border: 'border-[6px] border-white/95 dark:border-gray-800/95',
      glow: 'from-teal-400/25 via-cyan-300/20 to-blue-300/15',
      rings: ['border-teal-400/50', 'border-cyan-400/40'],
    },
    text: {
      name: 'bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent',
      handle: 'text-teal-600/80 dark:text-teal-400/80',
      bio: 'text-teal-700/75 dark:text-teal-300/75',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(173, 70%, 45%) 0%, hsl(210, 90%, 55%) 100%)',
      border: 'from-white/70 to-cyan-200/50',
      glow: 'from-teal-400/35 via-cyan-300/30 to-blue-300/25',
      text: 'text-white',
    },
    badge: {
      background: 'bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-400',
      text: 'text-teal-950',
      glow: 'from-teal-400 to-cyan-400',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-[0_8px_24px_rgba(20,184,166,0.3)]',
      secondary: 'bg-teal-50/50 dark:bg-teal-900/30 border-teal-300/50 dark:border-teal-700/50 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-200',
    },
    backCard: {
      borderGradient: 'from-teal-400/60 via-cyan-300/40 to-teal-400/20',
      accentGlow: 'shadow-[0_0_40px_rgba(20,184,166,0.15)]',
      topStripe: 'bg-gradient-to-r from-teal-500/30 via-cyan-400/40 to-teal-500/30',
      platformHoverGlow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.25)]',
      lightBase: 'bg-white/[0.45]',
      lightShadow: '0 8px 20px rgba(0,0,0,0.08)',
      lightBorderOpacity: 'opacity-24',
      dividerColor: 'from-gray-300/60',
    },
  },
  focus: {
    name: 'focus',
    displayName: 'Focus',
    icon: '🌓',
    card: {
      background: 'radial-gradient(circle at 50% 20%, rgba(17,24,39,0.98) 0%, rgba(31,41,55,0.95) 50%, rgba(17,24,39,0.92) 100%)',
      overlay: 'bg-[radial-gradient(ellipse_at_top,hsl(265,85%,60%)/15_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,hsl(217,91%,60%)/12_0%,transparent_50%)]',
      border: 'border-purple-500/40 dark:border-purple-400/40',
      shadow: 'shadow-[0_30px_80px_rgba(147,51,234,0.25),0_10px_30px_rgba(99,102,241,0.2),0_0_60px_rgba(147,51,234,0.15),inset_0_1px_0_rgba(167,139,250,0.2)]',
    },
    avatar: {
      border: 'border-[6px] border-purple-500/30 dark:border-purple-400/30',
      glow: 'from-purple-500/40 via-indigo-500/35 to-blue-500/30',
      rings: ['border-purple-500/60', 'border-indigo-500/50'],
    },
    text: {
      name: 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 bg-clip-text text-transparent',
      handle: 'text-purple-300/90 dark:text-purple-200/90',
      bio: 'text-purple-200/85 dark:text-purple-100/85',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(265, 85%, 60%) 0%, hsl(217, 91%, 60%) 100%)',
      border: 'from-purple-300/80 to-indigo-300/60',
      glow: 'from-purple-500/50 via-indigo-500/45 to-blue-500/40',
      text: 'text-white',
    },
    badge: {
      background: 'bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-400',
      text: 'text-purple-950',
      glow: 'from-purple-500 to-indigo-500',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-[0_8px_24px_rgba(147,51,234,0.4),0_0_60px_rgba(147,51,234,0.3)]',
      secondary: 'bg-purple-950/50 dark:bg-purple-900/40 border-purple-500/50 dark:border-purple-400/50 hover:bg-purple-900/60 dark:hover:bg-purple-800/50',
    },
    backCard: {
      borderGradient: 'from-purple-500/60 via-indigo-400/40 to-blue-400/30',
      accentGlow: 'shadow-[0_0_50px_rgba(147,51,234,0.2)]',
      topStripe: 'bg-gradient-to-r from-purple-600/30 via-indigo-500/40 to-blue-500/30',
      platformHoverGlow: 'hover:shadow-[0_0_35px_rgba(147,51,234,0.3)]',
      darkBase: 'bg-white/[0.07]',
      leftEdgeGlow: 'bg-gradient-to-r from-violet-500/30 to-transparent blur-md',
      textHeader: 'text-white/90',
      textInactive: 'text-gray-300/70',
      dividerColor: 'from-purple-400/40',
    },
  },
  expression: {
    name: 'expression',
    displayName: 'Expression',
    icon: '💎',
    card: {
      background: 'radial-gradient(circle at 50% 20%, rgba(250,245,255,0.95) 0%, rgba(243,232,255,0.8) 30%, rgba(224,242,254,0.7) 60%, rgba(254,240,220,0.6) 100%)',
      overlay: 'bg-[radial-gradient(ellipse_at_top,hsl(280,100%,70%)/15_0%,transparent_40%),radial-gradient(ellipse_at_bottom_right,hsl(320,100%,75%)/12_0%,transparent_40%),radial-gradient(ellipse_at_left,hsl(173,70%,45%)/10_0%,transparent_50%)]',
      border: 'border-transparent',
      shadow: 'shadow-[0_30px_80px_rgba(192,132,252,0.2),0_10px_30px_rgba(244,114,182,0.15),0_0_100px_rgba(134,239,172,0.1),inset_0_1px_0_rgba(255,255,255,0.5)]',
    },
    avatar: {
      border: 'border-[6px] border-transparent',
      glow: 'from-purple-400/35 via-pink-400/30 to-teal-300/25',
      rings: ['border-transparent', 'border-transparent'],
    },
    text: {
      name: 'bg-gradient-to-r from-purple-600 via-pink-500 to-teal-500 bg-clip-text text-transparent animate-gradient',
      handle: 'text-purple-600/80 dark:text-purple-400/80',
      bio: 'text-purple-700/75 dark:text-purple-300/75',
    },
    vitanaOrb: {
      background: 'linear-gradient(135deg, hsl(280, 100%, 70%) 0%, hsl(320, 100%, 75%) 50%, hsl(173, 70%, 55%) 100%)',
      border: 'from-purple-300/70 via-pink-300/60 to-teal-300/50',
      glow: 'from-purple-400/40 via-pink-400/35 to-teal-300/30',
      text: 'text-white',
    },
    badge: {
      background: 'bg-gradient-to-br from-purple-400 via-pink-400 to-teal-400',
      text: 'text-purple-950',
      glow: 'from-purple-400 via-pink-400 to-teal-400',
    },
    buttons: {
      primary: 'bg-gradient-to-r from-purple-500 via-pink-500 to-teal-500 hover:from-purple-600 hover:via-pink-600 hover:to-teal-600 shadow-[0_8px_24px_rgba(192,132,252,0.35),0_0_60px_rgba(244,114,182,0.25)]',
      secondary: 'bg-purple-50/60 dark:bg-purple-900/40 border-purple-300/60 dark:border-purple-700/60 hover:bg-purple-100/70 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-200',
    },
    backCard: {
      borderGradient: 'from-purple-400/60 via-pink-400/50 to-teal-400/40',
      accentGlow: 'shadow-[0_0_50px_rgba(192,132,252,0.2)]',
      topStripe: 'bg-gradient-to-r from-purple-500/30 via-pink-400/40 to-teal-400/35',
      platformHoverGlow: 'hover:shadow-[0_0_35px_rgba(192,132,252,0.25)]',
      lightBase: 'bg-white/[0.30]',
      lightShadow: '0 8px 20px rgba(0,0,0,0.08)',
      lightBorderOpacity: 'opacity-24',
      dividerColor: 'from-violet-300/50',
    },
  },
};

export function useProfileTheme(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [theme, setThemeState] = useState<ProfileTheme>('serenity');
  const [loading, setLoading] = useState(true);

  // Load theme from database
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
  }, [userId]);

  const setTheme = async (newTheme: ProfileTheme) => {
    // Only allow theme changes for own profile
    if (!user || !userId || user.id !== userId) {
      console.warn('Unauthorized theme change attempt');
      return;
    }

    // Optimistic update
    setThemeState(newTheme);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('user_id', userId);

      if (error) {
        console.error('Error saving theme:', error);
        // Revert on error
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', userId)
          .single();
        if (data?.theme) {
          setThemeState(data.theme as ProfileTheme);
        }
        toast({
          title: "Error updating theme",
          description: "Failed to save theme preference",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Theme updated",
        description: `Switched to ${THEME_CONFIGS[newTheme].displayName}`,
      });
    } catch (err) {
      console.error('Error updating theme:', err);
      setThemeState(theme);
    }
  };

  const cycleTheme = () => {
    const themes: ProfileTheme[] = ['serenity', 'focus', 'expression'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return {
    theme,
    themeConfig: THEME_CONFIGS[theme],
    setTheme,
    cycleTheme,
    loading,
  };
}
