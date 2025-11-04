export interface CategoryTheme {
  gradient: string;
  glow: string;
  icon: string;
  bg: string;
  hoverGlow: string;
  buttonColor: string;
}

export const categoryThemes: Record<string, CategoryTheme> = {
  Wellness: {
    gradient: 'from-pink-500 via-rose-400 to-pink-500',
    glow: 'rgba(236, 72, 153, 0.3)',
    icon: '🌸',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950/30 dark:to-rose-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(236,72,153,0.3)]',
    buttonColor: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
  },
  Nutrition: {
    gradient: 'from-green-500 via-emerald-400 to-green-500',
    glow: 'rgba(16, 185, 129, 0.3)',
    icon: '🥗',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
    buttonColor: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
  },
  Exercise: {
    gradient: 'from-orange-500 via-amber-400 to-orange-500',
    glow: 'rgba(249, 115, 22, 0.3)',
    icon: '🏋️',
    bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(249,115,22,0.3)]',
    buttonColor: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
  },
  Mental: {
    gradient: 'from-purple-500 via-indigo-400 to-purple-500',
    glow: 'rgba(139, 92, 246, 0.3)',
    icon: '🧘',
    bg: 'bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(139,92,246,0.3)]',
    buttonColor: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
  },
  Community: {
    gradient: 'from-blue-500 via-cyan-400 to-blue-500',
    glow: 'rgba(59, 130, 246, 0.3)',
    icon: '👥',
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]',
    buttonColor: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
  },
  Social: {
    gradient: 'from-fuchsia-500 via-pink-400 to-fuchsia-500',
    glow: 'rgba(217, 70, 239, 0.3)',
    icon: '💃',
    bg: 'bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-950/30 dark:to-pink-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(217,70,239,0.3)]',
    buttonColor: 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600'
  },
  Other: {
    gradient: 'from-gray-500 via-slate-400 to-gray-500',
    glow: 'rgba(100, 116, 139, 0.3)',
    icon: '📁',
    bg: 'bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950/30 dark:to-slate-950/30',
    hoverGlow: 'shadow-[0_0_40px_rgba(100,116,139,0.3)]',
    buttonColor: 'bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600'
  }
};

export const getCategoryTheme = (category: string): CategoryTheme => {
  return categoryThemes[category] || categoryThemes.Other;
};
