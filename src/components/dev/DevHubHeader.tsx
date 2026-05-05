/**
 * @deprecated This component is no longer used in VITANA Universal Design Pattern.
 * Settings, Sign Out, and user info are now in the sidebar.
 * Will be removed in Phase 2.
 */
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { t } from '@/lib/i18n-toast';

export function DevHubHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleSignOut = async () => {
    await signOut();
    navigate('/dev/login');
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">{t('screens.dev.vitanaDevCommandHub')}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{t('screens.dev.readonlyMode')}</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-2 md:gap-3">
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dev/settings')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Settings</span>
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarFallback className="text-xs">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden md:inline max-w-[150px] truncate">
                {user.email}
              </span>
            </div>
            
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {!isMobile && <span>{t('screens.dev.signOut')}</span>}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
