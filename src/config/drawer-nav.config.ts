import {
  Zap,
  Newspaper,
  Calendar,
  Users,
  Video,
  LayoutGrid,
  Briefcase,
  Compass,
  ShoppingBag,
  Wallet,
  HeartPulse,
  BookOpen,
  Plug,
  Mail,
  LifeBuoy,
  Settings2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

export interface DrawerNavItem {
  id: string;
  route: string;
  icon: LucideIcon;
  translationKey: string;
}

export interface DrawerIconTone {
  base: string;
  active: string;
}

export const drawerNavIconTones: Record<string, DrawerIconTone> = {
  journey:    { base: 'hsl(38 55% 55%)',  active: 'hsl(38 62% 46%)'  },
  news:       { base: 'hsl(215 22% 52%)', active: 'hsl(215 28% 42%)' },
  events:     { base: 'hsl(15 52% 58%)',  active: 'hsl(15 58% 48%)'  },
  'find-partner': { base: 'hsl(330 52% 60%)', active: 'hsl(330 60% 50%)' },
  live:       { base: 'hsl(350 42% 58%)', active: 'hsl(350 50% 48%)' },
  media:      { base: 'hsl(265 32% 60%)', active: 'hsl(265 38% 50%)' },
  business:   { base: 'hsl(30 32% 48%)',  active: 'hsl(30 40% 40%)'  },
  discover:   { base: 'hsl(185 38% 44%)', active: 'hsl(185 46% 36%)' },
  orders:     { base: 'hsl(140 28% 48%)', active: 'hsl(140 34% 38%)' },
  wallet:     { base: 'hsl(160 36% 44%)', active: 'hsl(160 42% 36%)' },
  health:     { base: 'hsl(345 42% 60%)', active: 'hsl(345 48% 50%)' },
  diary:      { base: 'hsl(240 26% 58%)', active: 'hsl(240 32% 48%)' },
  connectors: { base: 'hsl(195 38% 50%)', active: 'hsl(195 44% 40%)' },
  inbox:      { base: 'hsl(210 46% 56%)', active: 'hsl(210 52% 46%)' },
  support:    { base: 'hsl(0 60% 56%)',   active: 'hsl(0 65% 46%)'   },
  settings:   { base: 'hsl(220 10% 52%)', active: 'hsl(220 12% 42%)' },
};

export const drawerNavItems: DrawerNavItem[] = [
  { id: 'journey',    route: '/autopilot',               icon: Zap,         translationKey: 'drawerNav.journey' },
  { id: 'news',       route: '/home',                    icon: Newspaper,   translationKey: 'drawerNav.news' },
  { id: 'events',     route: '/comm/events-meetups',     icon: Calendar,    translationKey: 'drawerNav.events' },
  { id: 'find-partner', route: '/comm/find-partner',     icon: Users,       translationKey: 'drawerNav.findPartner' },
  { id: 'live',       route: '/comm/live-rooms',         icon: Video,       translationKey: 'drawerNav.live' },
  { id: 'media',      route: '/comm/media-hub',          icon: LayoutGrid,  translationKey: 'drawerNav.media' },
  { id: 'business',   route: '/business',                icon: Briefcase,   translationKey: 'drawerNav.business' },
  { id: 'discover',   route: '/discover',                icon: Compass,     translationKey: 'drawerNav.discover' },
  { id: 'orders',     route: '/discover/orders',         icon: ShoppingBag, translationKey: 'drawerNav.orders' },
  { id: 'wallet',     route: '/wallet',                  icon: Wallet,      translationKey: 'drawerNav.wallet' },
  { id: 'health',     route: '/health',                  icon: HeartPulse,  translationKey: 'drawerNav.health' },
  { id: 'diary',      route: '/daily-diary',             icon: BookOpen,    translationKey: 'drawerNav.diary' },
  { id: 'connectors', route: '/connectors',              icon: Plug,        translationKey: 'drawerNav.connectors' },
  { id: 'inbox',      route: '/inbox',                   icon: Mail,        translationKey: 'drawerNav.inbox' },
  { id: 'support',    route: '/support',                 icon: LifeBuoy,    translationKey: 'drawerNav.support' },
  { id: 'settings',        route: '/settings',                icon: Settings2,   translationKey: 'drawerNav.settings' },
  { id: 'logout',          route: '__logout__',               icon: LogOut,      translationKey: 'drawerNav.logout' },
];
