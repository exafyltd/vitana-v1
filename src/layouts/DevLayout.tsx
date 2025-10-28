import { ReactNode, useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DevSidebar } from "@/components/dev/DevSidebar";
import { useAuth } from "@/context/AuthProvider";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { useErrorNotifications } from "@/hooks/useErrorNotifications";
import { ErrorNotificationStack } from "@/components/ErrorNotificationStack";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";

interface DevLayoutProps {
  children?: ReactNode;
}

export default function DevLayout({ children }: DevLayoutProps) {
  const { user } = useAuth();
  const { errors, dismissError } = useErrorNotifications();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // StreamingChat ref for Glass Mode
  const streamingChatRef = useRef<StreamingChatRef>(null);

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('dev_sidebar_open');
    return stored === null ? true : stored === 'true';
  });

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('dev_sidebar_open', sidebarOpen.toString());
  }, [sidebarOpen]);

  // Keyboard shortcut (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!DEV_HUB_CONFIG.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Dev Hub Disabled</h1>
          <p className="text-muted-foreground">Dev Hub is currently disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Mobile: Sheet, Desktop: Sidebar */}
        <DevSidebar 
          user={user} 
          mobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
          streamingChatRef={streamingChatRef}
        />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile Menu Button */}
          {isMobile && (
            <div className="border-b bg-card px-4 py-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="min-h-[44px] min-w-[44px]"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium">Menu</span>
            </div>
          )}
          
          <main className="flex-1 overflow-auto pb-28">
            {children || <Outlet />}
          </main>
        </div>
        
        {/* Error Notification Stack */}
        <ErrorNotificationStack errors={errors} onDismiss={dismissError} />
        
        {/* Communication Bar */}
        <StreamingChat ref={streamingChatRef} />
      </div>
    </SidebarProvider>
  );
}
