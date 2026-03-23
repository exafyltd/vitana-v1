import {
  Calendar,
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
  UserCircle,
  Trash2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

export interface DrawerNavItem {
  id: string;
  route: string;
  icon: LucideIcon;
  translationKey: string;
}

export const drawerNavItems: DrawerNavItem[] = [
  { id: 'events',     route: '/comm/events-meetups',     icon: Calendar,    translationKey: 'drawerNav.events' },
  { id: 'live',       route: '/comm/live-rooms',         icon: Video,       translationKey: 'drawerNav.live' },
  { id: 'media',      route: '/comm/media-hub',          icon: LayoutGrid,  translationKey: 'drawerNav.media' },
  { id: 'business',   route: '/business',                icon: Briefcase,   translationKey: 'drawerNav.business' },
  { id: 'discover',   route: '/discover',                icon: Compass,     translationKey: 'drawerNav.discover' },
  { id: 'orders',     route: '/discover/orders',         icon: ShoppingBag, translationKey: 'drawerNav.orders' },
  { id: 'wallet',     route: '/wallet',                  icon: Wallet,      translationKey: 'drawerNav.wallet' },
  { id: 'health',     route: '/health',                  icon: HeartPulse,  translationKey: 'drawerNav.health' },
  { id: 'diary',      route: '/daily-diary',             icon: BookOpen,    translationKey: 'drawerNav.diary' },
  { id: 'connectors', route: '/settings/connected-apps', icon: Plug,        translationKey: 'drawerNav.connectors' },
  { id: 'inbox',      route: '/inbox',                   icon: Mail,        translationKey: 'drawerNav.inbox' },
  { id: 'profile',         route: '/me/profile',              icon: UserCircle,  translationKey: 'drawerNav.profile' },
  { id: 'delete-account',  route: '/delete-account',          icon: Trash2,      translationKey: 'drawerNav.deleteAccount' },
  { id: 'logout',          route: '__logout__',               icon: LogOut,      translationKey: 'drawerNav.logout' },
];
