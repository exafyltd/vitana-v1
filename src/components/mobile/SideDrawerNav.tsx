import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { drawerNavItems } from '@/config/drawer-nav.config';
import { useTranslation } from '@/hooks/useTranslation';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/context/AuthProvider';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { getInstantTenantName } from '@/lib/tenant-display';
import { supabase } from '@/integrations/supabase/client';
import { isIAPRestricted } from '@/lib/appilix';

interface SideDrawerNavProps {
  open: boolean;
  onClose: () => void;
}

export function SideDrawerNav({ open, onClose }: SideDrawerNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { tenant } = useTenant();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const { unreadCount } = useChatUnreadCount();

  const isMaxina = tenant?.slug === 'maxina';
  const tenantName = tenant?.name || getInstantTenantName(location.pathname);

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
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.nav
            className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-background shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-5"
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
              <div>
                <div className="font-bold text-lg tracking-wide">
                  {isMaxina ? 'Vitanaland' : tenantName}
                </div>
                {isMaxina && (
                  <div className="text-xs opacity-80 mt-0.5">
                    Maxina Experience
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 py-3 border-b border-border/50">
              <form
                className="relative"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    const q = searchQuery.trim();
                    setSearchQuery('');
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                    onClose();
                  }
                }}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members, groups, or..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm rounded-xl bg-muted/40 border-border"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-label="Search"
                  >
                    <Search className="h-3 w-3" />
                  </button>
                )}

                {/* Live search dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-[60] overflow-hidden max-h-72 overflow-y-auto">
                    {searching && (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Searching…</span>
                      </div>
                    )}
                    {!searching && results.length === 0 && (
                      <div className="px-3 py-3 text-sm text-muted-foreground">No members found</div>
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
                            setSearchQuery('');
                            setResults([]);
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

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-2 px-3" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
              {(isIAPRestricted() ? drawerNavItems.filter(item => item.id !== 'wallet') : drawerNavItems).map((item) => {
                const active = isActive(item.route);
                const Icon = item.icon;
                const isDestructive = item.id === 'logout';

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
                    <Icon className="h-5 w-5 shrink-0" />
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
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
