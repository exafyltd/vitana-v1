import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { loginRouteWithRedirect } from "@/lib/guest-auth";

interface PublicAppShellProps {
  children: React.ReactNode;
}

/**
 * Minimal storefront shell for signed-out visitors browsing the public
 * Discover surface. Instead of the full member sidebar/nav (which depends on an
 * authenticated session), guests get a lightweight top bar — logo + Discover +
 * Sign in — so the page reads like a public storefront, not a half-broken
 * member area. Deliberately avoids every auth-scoped hook (role, profile,
 * cart, autopilot, tenant) and the member MobileAppShell drawer so it renders
 * cleanly with no session.
 */
export default function PublicAppShell({ children }: PublicAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { translate } = useTranslation();

  const goToSignIn = () => navigate(loginRouteWithRedirect());

  const onDiscover =
    location.pathname === "/discover" || location.pathname.startsWith("/discover/");

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          {/* Logo */}
          <Link to="/discover" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold tracking-wide">{"VITANA"}</span>
          </Link>

          {/* Minimal nav: Discover only */}
          <nav className="flex flex-1 items-center justify-center">
            <Link
              to="/discover"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                onDiscover
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-4 w-4" />
              {translate("sidebar.discover", "Discover")}
            </Link>
          </nav>

          {/* Sign in */}
          <Button size="sm" onClick={goToSignIn} className="shrink-0">
            <LogIn className="h-4 w-4" />
            <span className="ml-2">{translate("discover.guest.signIn", "Sign in")}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
