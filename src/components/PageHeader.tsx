import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon className="w-8 h-8 text-primary drop-shadow-sm" />}
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}