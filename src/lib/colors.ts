// Health category color constants for consistent use across the app
// All colors are pastel/soft variants for a calming wellness experience

export const HEALTH_CATEGORY_COLORS = {
  vitana: {
    bg: "bg-gradient-to-br from-teal-100 to-teal-200",
    icon: "text-teal-700",
    ring: "ring-teal-200/50"
  },
  autopilot: {
    bg: "bg-gradient-to-br from-amber-100 to-amber-200",
    icon: "text-amber-700",
    ring: "ring-amber-200/50"
  },
  nutrition: {
    bg: "bg-gradient-to-br from-green-100 to-green-200",
    icon: "text-green-700",
    ring: "ring-green-200/50"
  },
  hydration: {
    bg: "bg-gradient-to-br from-blue-100 to-blue-200",
    icon: "text-blue-700",
    ring: "ring-blue-200/50"
  },
  exercise: {
    bg: "bg-gradient-to-br from-orange-100 to-orange-200",
    icon: "text-orange-700",
    ring: "ring-orange-200/50"
  },
  sleep: {
    bg: "bg-gradient-to-br from-purple-100 to-purple-200",
    icon: "text-purple-700",
    ring: "ring-purple-200/50"
  },
  mental: {
    bg: "bg-gradient-to-br from-pink-50 to-pink-100",
    icon: "text-pink-600",
    ring: "ring-pink-100/50"
  },
  community: {
    bg: "bg-gradient-to-br from-indigo-100 to-indigo-200",
    icon: "text-indigo-700",
    ring: "ring-indigo-200/50"
  },
  calendar: {
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
    icon: "text-emerald-700",
    ring: "ring-emerald-200/50"
  },
  data: {
    bg: "bg-gradient-to-br from-slate-100 to-slate-200",
    icon: "text-slate-700",
    ring: "ring-slate-200/50"
  },
  podcast: {
    bg: "bg-gradient-to-br from-yellow-100 to-yellow-200",
    icon: "text-yellow-700",
    ring: "ring-yellow-200/50"
  },
  music: {
    bg: "bg-gradient-to-br from-rose-100 to-rose-200",
    icon: "text-rose-700",
    ring: "ring-rose-200/50"
  },
  video: {
    bg: "bg-gradient-to-br from-cyan-100 to-cyan-200",
    icon: "text-cyan-700",
    ring: "ring-cyan-200/50"
  }
} as const;

export type HealthCategoryColor = keyof typeof HEALTH_CATEGORY_COLORS;