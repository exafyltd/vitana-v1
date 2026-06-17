import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

import { useTranslation } from "@/hooks/useTranslation";
import { track } from "@/lib/product-analytics/client";

interface SubNavItem {
  id: string;
  name: string;
  path: string;
  indicator?: React.ReactNode;
  i18nKey?: string; // Translation key for internationalization
}

interface SubNavigationProps {
  items: SubNavItem[];
  className?: string;
  rightActions?: React.ReactNode;
}

export default function SubNavigation({ items, className, rightActions }: SubNavigationProps) {
  const { translate } = useTranslation();
  
  return (
    <nav className={cn("border-b bg-background/95 backdrop-blur", className)}>
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto">
            {items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end
                onClick={() => {
                  console.log(`Navigating to: ${item.path} (${item.name})`);
                  console.log("Current pathname:", window.location.pathname);
                  track("navigation_clicked", {
                    event_type: "journey",
                    feature_key: "navigation",
                    properties: {
                      nav_label: item.name,
                      nav_target_route: item.path,
                      current_route: window.location.pathname,
                    },
                  });
                }}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-muted text-foreground shadow-md"
                      : "bg-transparent text-muted-foreground hover:bg-muted hover:shadow-md hover:text-foreground"
                  )
                }
              >
                {translate(item.i18nKey ?? '', item.name)}
                {item.indicator}
              </NavLink>
            ))}
          </div>
          {rightActions && (
            <div className="flex items-center gap-3 ml-4">
              {rightActions}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}