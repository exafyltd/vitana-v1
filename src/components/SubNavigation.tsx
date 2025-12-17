import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ConnectionStatus } from "./ui/ConnectionStatus";

interface SubNavItem {
  id: string;
  name: string;
  path: string;
  indicator?: React.ReactNode;
}

interface SubNavigationProps {
  items: SubNavItem[];
  className?: string;
  rightActions?: React.ReactNode;
}

export default function SubNavigation({ items, className, rightActions }: SubNavigationProps) {
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
                {item.name}
                {item.indicator}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <ConnectionStatus />
            {rightActions && rightActions}
          </div>
        </div>
      </div>
    </nav>
  );
}