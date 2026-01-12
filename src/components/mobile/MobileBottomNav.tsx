import { NavLink } from "react-router-dom";
import { Calendar, Briefcase, Activity, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "events", label: "Events", icon: Calendar, path: "/events" },
  { id: "business", label: "Business", icon: Briefcase, path: "/business" },
  { id: "health", label: "Health", icon: Activity, path: "/health" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export function MobileBottomNav() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors",
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/70"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
