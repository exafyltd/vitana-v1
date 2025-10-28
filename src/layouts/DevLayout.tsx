import { ReactNode, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DevSidebar } from "@/components/dev/DevSidebar";
import { DevHubHeader } from "@/components/dev/DevHubHeader";
import { useAuth } from "@/context/AuthProvider";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { useErrorNotifications } from "@/hooks/useErrorNotifications";
import { ErrorNotificationStack } from "@/components/ErrorNotificationStack";

interface DevLayoutProps {
  children?: ReactNode;
}

export default function DevLayout({ children }: DevLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { errors, dismissError } = useErrorNotifications();

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('dev_sidebar_open');
    return stored === null ? true : stored === 'true';
  });

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
        <DevSidebar user={user} />
        
        <div className="flex-1 flex flex-col">
          <DevHubHeader />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6">
              {children || <Outlet />}
            </div>
          </main>
        </div>
        
        {/* Error Notification Stack */}
        <ErrorNotificationStack errors={errors} onDismiss={dismissError} />
      </div>
    </SidebarProvider>
  );
}
