import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface MobileEntryCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}

export function MobileEntryCard({ icon, title, subtitle, to }: MobileEntryCardProps) {
  return (
    <Link 
      to={to}
      className="flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur border shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate">{title}</div>
        <div className="text-sm text-muted-foreground truncate">{subtitle}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </Link>
  );
}
