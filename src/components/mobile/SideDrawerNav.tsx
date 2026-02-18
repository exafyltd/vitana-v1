import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { drawerNavItems } from '@/config/drawer-nav.config';
import { useTranslation } from '@/hooks/useTranslation';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/context/AuthProvider';

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

  const isMaxina = tenant?.slug === 'maxina';
  const tenantName = tenant?.name || 'Community';

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

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-2 px-3">
              {drawerNavItems.map((item) => {
                const active = isActive(item.route);
                const Icon = item.icon;
                const isLogout = item.id === 'logout';

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
                          : isLogout
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
                    <span>{translate(item.translationKey)}</span>
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
