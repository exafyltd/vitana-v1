import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  name: string;
  path: string;
  indicator?: React.ReactNode;
}

interface MobileBusinessNavProps {
  items: NavItem[];
}

export function MobileBusinessNav({ items }: MobileBusinessNavProps) {
  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b pt-safe">
      <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/business'}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )
              }
            >
              {item.name}
              {item.indicator}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
