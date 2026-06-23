import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Calendar, Bell, Plane, ShoppingCart, Music2, Volume2, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EnhancedCalendarPopup } from '@/components/calendar/EnhancedCalendarPopup';
import { AutopilotPopup } from '@/components/AutopilotPopup';
// Phase 0: CartSidebar retired from the buy path — cart action navigates to /universal-cart.
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { drawerNavItems, drawerNavIconTones } from '@/config/drawer-nav.config';
import { useTranslation } from '@/hooks/useTranslation';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/context/ProfileProvider';
import { useRole } from '@/hooks/useRole';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useNotifications } from '@/hooks/useNotifications';
import { useUniversalCart } from '@/hooks/useUniversalCart';
import { avatarPositionStyle } from '@/lib/avatarPosition';
import { supabase } from '@/integrations/supabase/client';
import { isIAPRestricted } from '@/lib/appilix';
import { useSoundscape } from '@/context/SoundscapeContext';
import { t } from '@/lib/i18n-toast';

interface SideDrawerNavProps {
  open: boolean;
  onClose: () => void;
}

export function SideDrawerNav({ open, onClose }: SideDrawerNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { tenant, isExafyAdmin } = useTenant();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  // Use unforced DB role: useRole() pins currentRole to "community" on mobile
  // for permissioning, but the drawer subtitle should reflect the real role.
  const { dbRole } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const { unreadCount } = useChatUnreadCount();
  // Bell badge only — the panel re-subscribes inside <NotificationsPanel />
  const { unreadCount: notificationUnreadCount } = useNotifications(20);
  // Phase 0: counts from the one canonical cart (0 when roleBlocked).
  const { cartCount } = useUniversalCart();

  // Soundscape mute — relocated here from the mobile App Bar (mirrors the
  // desktop sidebar's SoundscapeControl). SoundscapeProvider wraps the whole
  // app (App.tsx), so the context is always available here.
  const soundscape = useSoundscape();

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const openPopup = (setter: (v: boolean) => void) => {
    setter(true);
    onClose();
  };

  const isMaxina = tenant?.slug === 'maxina';
  const roleLabel = isExafyAdmin
    ? 'Exafy Admin'
    : dbRole === 'admin'
    ? 'Administrator'
    : dbRole === 'staff'
    ? 'Staff'
    : dbRole === 'professional'
    ? 'Professional'
    : dbRole === 'patient'
    ? 'Patient'
    : 'Community Member';
  const secondaryLine = profile.handle ? `@${profile.handle}` : roleLabel;

  const handleProfileClick = () => {
    onClose();
    navigate('/me/profile');
  };

  const handleQuickAction = (route: string) => {
    onClose();
    navigate(route);
  };

  const closeSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setResults([]);
  };

  // Debounced live search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('is_visible', true)
        .ilike('display_name', `%${searchQuery.trim()}%`)
        .limit(6);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleItemClick = async (item: (typeof drawerNavItems)[number]) => {
    onClose();

    if (item.id === 'logout') {
      await signOut();
      // Clear caches
      const qc = (window as any).queryClient;
      if (qc) qc.clear();
      localStorage.removeItem('vitana-query-cache');
      navigate('/', { replace: true });
      return;
    }

    navigate(item.route);
  };

  const isActive = (route: string) => {
    if (route === '__logout__') return false;
    if (location.pathname === route) return true;
    // For /discover vs /discover/orders, be exact
    if (route === '/discover') return location.pathname === '/discover';
    return location.pathname.startsWith(route + '/');
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.nav
            className="fixed top-0 left-0 bottom-0 z-[60] w-72 flex flex-col bg-background shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header — profile entry */}
            <div
              className="flex items-center gap-3 px-5 py-3.5"
              style={
                isMaxina
                  ? {
                      background:
                        'linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)',
                      color: 'rgba(255,255,255,0.95)',
                    }
                  : undefined
              }
            >
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl -mx-1 px-1 py-1 hover:bg-white/10 transition-colors"
                aria-label={t('screens.mobile.openMyProfile')}
              >
                <Avatar className="h-9 w-9 ring-1 ring-white/40 shrink-0">
                  <AvatarImage
                    src={profile.avatar}
                    alt={profile.displayName}
                    style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="font-bold text-base tracking-wide truncate">
                    {profile.displayName}
                  </div>
                  <div className="text-xs opacity-80 truncate">
                    {secondaryLine}
                  </div>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label={t('screens.mobile.closeDrawer')}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Quick actions — collapsed strip OR expanded search */}
            {!searchActive ? (
              <div className="flex items-stretch gap-1 px-3 pt-3 pb-1.5 border-b border-border/50">
                <button
                  onClick={() => setSearchActive(true)}
                  aria-label={t('screens.mobile.openSearch')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Search className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.search')}</span>
                </button>

                <button
                  onClick={() => openPopup(setCalendarOpen)}
                  aria-label={t('screens.mobile.openCalendar')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Calendar className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.calendar')}</span>
                </button>

                <button
                  onClick={() => openPopup(setNotificationsOpen)}
                  aria-label={`Open notifications${notificationUnreadCount > 0 ? `, ${notificationUnreadCount} unread` : ''}`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Bell className="h-[18px] w-[18px]" />
                    <NotificationBadge
                      count={notificationUnreadCount}
                      collapsed
                      ariaLabel={`${notificationUnreadCount} unread notification${notificationUnreadCount !== 1 ? 's' : ''}`}
                    />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.alerts')}</span>
                </button>

                <button
                  onClick={() => openPopup(setAutopilotOpen)}
                  aria-label={t('screens.mobile.openAutopilot')}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Plane className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.autopilot')}</span>
                </button>

                <button
                  onClick={() => { onClose(); navigate('/universal-cart'); }}
                  aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? 's' : ''}` : ''}`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-foreground/80 hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <ShoppingCart className="h-[18px] w-[18px]" />
                    <NotificationBadge
                      count={cartCount}
                      collapsed
                      ariaLabel={`${cartCount} item${cartCount !== 1 ? 's' : ''} in cart`}
                    />
                  </div>
                  <span className="text-[10px] leading-none text-muted-foreground">{t('screens.mobile.cart')}</span>
                </button>
              </div>
            ) : (
              <div className="px-3 pt-3 pb-2 border-b border-border/50">
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      const q = searchQuery.trim();
                      closeSearch();
                      navigate(`/search?q=${encodeURIComponent(q)}`);
                      onClose();
                    }
                  }}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    type="text"
                    placeholder={t('screens.mobile.searchMembersGroups')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm rounded-xl bg-muted/40 border-border"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label={t('screens.mobile.closeSearch')}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Live search dropdown */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-[60] overflow-hidden max-h-72 overflow-y-auto">
                      {searching && (
                        <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('screens.mobile.searching')}</span>
                        </div>
                      )}
                      {!searching && results.length === 0 && (
                        <div className="px-3 py-3 text-sm text-muted-foreground">{t('screens.mobile.noMembersFound')}</div>
                      )}
                      {results.map((r) => {
                        const name = r.display_name || 'Unknown';
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <button
                            key={r.user_id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              closeSearch();
                              navigate(`/u/${r.user_id}`);
                              onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-sm text-foreground transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              {r.avatar_url && <AvatarImage src={r.avatar_url} alt={name} />}
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto pt-1.5 pb-2 px-3">
              {(isIAPRestricted() ? drawerNavItems.filter(item => item.id !== 'wallet') : drawerNavItems).map((item) => {
                const active = isActive(item.route);
                const Icon = item.icon;
                const isDestructive = item.id === 'logout';
                const tone = !isDestructive ? drawerNavIconTones[item.id] : undefined;
                const iconStyle = tone ? { color: active ? tone.active : tone.base } : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`
                      relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5
                      text-sm font-medium transition-all duration-150
                      ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : isDestructive
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" style={iconStyle} />
                    <span className="flex-1 text-left">{translate(item.translationKey)}</span>
                    {item.id === 'inbox' && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Soundscape footer — play/pause + mute, mirrors the desktop sidebar.
                The safe-area inset is CAPPED: the Appilix Android WebView reports
                a large `env(safe-area-inset-bottom)` (~120px) even though the
                system nav renders as a separate bar outside the drawer, which
                otherwise leaves a big empty band below the player. Cap the inset
                contribution so we still clear a gesture pill without the bloat. */}
            <div
              className="border-t border-border/50 px-3 pt-1.5"
              style={{ paddingBottom: 'calc(0.75rem + min(env(safe-area-inset-bottom, 0px), 16px))' }}
            >
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                <button
                  onClick={() => soundscape.toggle()}
                  aria-label={t('screens.audio.soundscape')}
                  className="flex items-center justify-center h-8 w-8 rounded-full shrink-0 hover:bg-muted transition-colors"
                >
                  <Music2 className={`h-4 w-4 ${soundscape.isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                </button>
                <span className="flex-1 text-sm text-foreground">{t('screens.audio.soundscape')}</span>
                <button
                  onClick={() => soundscape.toggleMute()}
                  aria-label={soundscape.isMuted ? t('screens.audio.unmute') : t('screens.audio.mute')}
                  className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                >
                  {soundscape.isMuted ? (
                    <VolumeX className="h-[18px] w-[18px] text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-[18px] w-[18px] text-foreground" />
                  )}
                </button>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>

    {/* Quick-action popups — live outside the drawer so they persist after it closes */}
    <EnhancedCalendarPopup open={calendarOpen} onOpenChange={setCalendarOpen} />
    <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    {/* Phase 0: CartSidebar retired — the cart action navigates to /universal-cart. */}

    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 gap-0 rounded-2xl overflow-hidden top-[calc(env(safe-area-inset-top,0px)+1.5rem)] translate-y-0">
        <NotificationsPanel
          onNavigated={() => setNotificationsOpen(false)}
          onClose={() => setNotificationsOpen(false)}
          maxHeightClassName="max-h-[85vh]"
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
