import { useState } from "react";
import {
  User,
  Heart,
  Calendar,
  Briefcase,
  Users,
  BookOpen,
  DollarSign,
  MapPin,
  Globe,
  Sparkles,
  Settings,
  Sprout,
} from "lucide-react";
import { MemoryCategoryCard } from "./MemoryCategoryCard";
import { useMemoryMetadata } from "@/hooks/useMemoryMetadata";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const MEMORY_CATEGORIES = [
  {
    id: "personal-identity",
    title: "Personal Identity",
    icon: User,
    gradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
    defaultInsight: "Build your personal profile and preferences",
  },
  {
    id: "health-wellness",
    title: "Health & Wellness",
    icon: Heart,
    gradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
    defaultInsight: "Track your health journey and wellness data",
  },
  {
    id: "lifestyle-routines",
    title: "Lifestyle & Routines",
    icon: Calendar,
    gradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
    defaultInsight: "Document your daily habits and routines",
  },
  {
    id: "business-projects",
    title: "Business & Projects",
    icon: Briefcase,
    gradient: "bg-gradient-to-br from-orange-500/20 to-amber-500/20",
    defaultInsight: "Manage your professional life and projects",
  },
  {
    id: "network-relationships",
    title: "Network & Relationships",
    icon: Users,
    gradient: "bg-gradient-to-br from-pink-500/20 to-rose-500/20",
    defaultInsight: "Remember important people and connections",
  },
  {
    id: "learning-knowledge",
    title: "Learning & Knowledge",
    icon: BookOpen,
    gradient: "bg-gradient-to-br from-indigo-500/20 to-purple-500/20",
    defaultInsight: "Store insights and learning experiences",
  },
  {
    id: "finance-assets",
    title: "Finance & Assets",
    icon: DollarSign,
    gradient: "bg-gradient-to-br from-yellow-500/20 to-green-500/20",
    defaultInsight: "Track financial goals and resources",
  },
  {
    id: "location-environment",
    title: "Location & Environment",
    icon: MapPin,
    gradient: "bg-gradient-to-br from-teal-500/20 to-cyan-500/20",
    defaultInsight: "Remember places and environments you love",
  },
  {
    id: "digital-footprint",
    title: "Digital Footprint & Data",
    icon: Globe,
    gradient: "bg-gradient-to-br from-blue-500/20 to-indigo-500/20",
    defaultInsight: "Organize your digital presence and data",
  },
  {
    id: "values-aspirations",
    title: "Values & Aspirations",
    icon: Sparkles,
    gradient: "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20",
    defaultInsight: "Define what matters most to you",
  },
  {
    id: "autopilot-settings",
    title: "Autopilot & Context",
    icon: Settings,
    gradient: "bg-gradient-to-br from-gray-500/20 to-slate-500/20",
    defaultInsight: "Configure AI behavior and preferences",
  },
  {
    id: "future-plans",
    title: "Future Plans & Evolution",
    icon: Sprout,
    gradient: "bg-gradient-to-br from-lime-500/20 to-green-500/20",
    defaultInsight: "Plan your growth and future goals",
  },
];

export function MemoryCategoryGrid() {
  const { metadata, refreshMetadata, isRefreshing, getCategoryProgress } = useMemoryMetadata();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // TODO: Open split-screen view
  };

  const handleAddMemory = (categoryId: string) => {
    // TODO: Open focused popup for adding memory
    console.log("Add memory to category:", categoryId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Memory Garden</h2>
          <p className="text-sm text-muted-foreground">
            {metadata?.total_memories_count || 0} total memories across all categories
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMetadata()}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Progress
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MEMORY_CATEGORIES.map((category) => {
          const progress = getCategoryProgress(category.id);
          return (
            <MemoryCategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              progress={progress?.progress || 0}
              memoryCount={progress?.memoryCount || 0}
              insight={
                progress?.memoryCount
                  ? `${progress.avgConfidence}% AI confidence · Last updated ${new Date(progress.lastUpdated).toLocaleDateString()}`
                  : category.defaultInsight
              }
              gradient={category.gradient}
              onClick={() => handleCategoryClick(category.id)}
              onAdd={() => handleAddMemory(category.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
