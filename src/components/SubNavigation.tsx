import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SubNavItem {
  id: string;
  name: string;
  path: string;
}

interface SubNavigationProps {
  items: SubNavItem[];
  className?: string;
}

export default function SubNavigation({ items, className }: SubNavigationProps) {
  return (
    <nav className={cn("border-b bg-background/95 backdrop-blur", className)}>
      <div className="px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-sm",
                  "hover:bg-muted hover:shadow-md",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}