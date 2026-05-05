import { useState } from "react";
import {
  Heart,
  Activity,
  Calendar,
  Briefcase,
  Users,
  GraduationCap,
  DollarSign,
  MapPin,
  Wifi,
  Target,
  Settings,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { MemoryCategoryCard } from "./MemoryCategoryCard";
import { AddMemoryDialog } from "./AddMemoryDialog";
import { CategoryDetailDialog } from "./CategoryDetailDialog";
import { Button } from "@/components/ui/button";
import { useMemoryMetadata } from "@/hooks/useMemoryMetadata";
import { notifySuccess, t } from '@/lib/i18n-toast';

const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "personal-identity": ["Name", "Languages", "Personality", "Strengths", "Life Vision", "Values", "Goals", "Decision Style", "Roles"],
  "health-wellness": ["Vitana Index", "Biomarkers", "Nutrition", "Sleep", "Exercise", "Hydration", "Stress", "Mental Health", "Doctors", "Supplements", "Preventive Goals"],
  "lifestyle-routines": ["Morning Routine", "Evening Routine", "Fitness Schedule", "Nutrition Timing", "Travel Patterns", "Hobbies", "Ideal Day", "Environment Preferences"],
  "business-projects": ["Company", "Role", "Projects", "Goals", "Collaborators", "Investors", "Achievements", "Work Preferences", "Future Opportunities"],
  "network-relationships": ["Family", "Friends", "Mentors", "Partners", "Clients", "Community Members", "Contact History", "Communication Preferences", "Relationship Health"],
  "learning-knowledge": ["Skills", "Courses", "Books", "Podcasts", "Knowledge Wishlist", "Inspirations", "Thought Leaders", "Notes", "Quotes"],
  "finance-assets": ["Income Streams", "Investments", "Expenses", "Budgets", "Goals", "Donations", "Net Worth", "Advisors", "Tax Records", "Subscriptions"],
  "location-environment": ["Homes", "Offices", "Travel Destinations", "Climate Preferences", "Mobility Profile", "Environmental Sensitivities", "Favorite Places"],
  "digital-footprint": ["Connected Apps", "Permissions", "Privacy Settings", "API Integrations", "Screen Time", "Cloud Sync", "Forget Settings", "AI Audit Log"],
  "values-aspirations": ["Core Beliefs", "Definition of Success", "Legacy", "Spiritual Influences", "Causes", "Gratitude Journal", "Ethical Rules", "Reflections"],
  "autopilot-settings": ["Consent Levels", "Response Tone", "Decision Permissions", "Routine Check Frequency", "Data Visibility", "AI Trust Levels"],
  "future-plans": ["1-Year Goals", "5-Year Plan", "Lifetime Vision", "Bucket List", "Legacy Projects", "Pending Dreams", "AI-Coached Objectives"],
  "general": ["Miscellaneous", "Needs Categorization"],
};

const MEMORY_CATEGORIES = [
  {
    id: "personal-identity",
    title: "Personal Identity",
    icon: Heart,
    gradient: "bg-gradient-to-br from-pink-500 to-rose-500",
    defaultInsight: "Building your core identity profile",
    subcategories: CATEGORY_SUBCATEGORIES["personal-identity"],
  },
  {
    id: "health-wellness",
    title: "Health & Wellness",
    icon: Activity,
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
    defaultInsight: "Tracking your vitality and well-being",
    subcategories: CATEGORY_SUBCATEGORIES["health-wellness"],
  },
  {
    id: "lifestyle-routines",
    title: "Lifestyle & Routines",
    icon: Calendar,
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    defaultInsight: "Capturing your daily patterns",
    subcategories: CATEGORY_SUBCATEGORIES["lifestyle-routines"],
  },
  {
    id: "business-projects",
    title: "Business & Projects",
    icon: Briefcase,
    gradient: "bg-gradient-to-br from-purple-500 to-violet-500",
    defaultInsight: "Mapping your professional journey",
    subcategories: CATEGORY_SUBCATEGORIES["business-projects"],
  },
  {
    id: "network-relationships",
    title: "Network & Relationships",
    icon: Users,
    gradient: "bg-gradient-to-br from-orange-500 to-amber-500",
    defaultInsight: "Understanding your social ecosystem",
    subcategories: CATEGORY_SUBCATEGORIES["network-relationships"],
  },
  {
    id: "learning-knowledge",
    title: "Learning & Knowledge",
    icon: GraduationCap,
    gradient: "bg-gradient-to-br from-indigo-500 to-blue-500",
    defaultInsight: "Growing your knowledge base",
    subcategories: CATEGORY_SUBCATEGORIES["learning-knowledge"],
  },
  {
    id: "finance-assets",
    title: "Finance & Assets",
    icon: DollarSign,
    gradient: "bg-gradient-to-br from-yellow-500 to-orange-500",
    defaultInsight: "Building financial clarity",
    subcategories: CATEGORY_SUBCATEGORIES["finance-assets"],
  },
  {
    id: "location-environment",
    title: "Location & Environment",
    icon: MapPin,
    gradient: "bg-gradient-to-br from-teal-500 to-green-500",
    defaultInsight: "Mapping your physical world",
    subcategories: CATEGORY_SUBCATEGORIES["location-environment"],
  },
  {
    id: "digital-footprint",
    title: "Digital Footprint",
    icon: Wifi,
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500",
    defaultInsight: "Managing your digital presence",
    subcategories: CATEGORY_SUBCATEGORIES["digital-footprint"],
  },
  {
    id: "values-aspirations",
    title: "Values & Aspirations",
    icon: Target,
    gradient: "bg-gradient-to-br from-red-500 to-pink-500",
    defaultInsight: "Defining your compass",
    subcategories: CATEGORY_SUBCATEGORIES["values-aspirations"],
  },
  {
    id: "autopilot-settings",
    title: "Autopilot & Context",
    icon: Settings,
    gradient: "bg-gradient-to-br from-gray-500 to-slate-500",
    defaultInsight: "Configuring your AI companion",
    subcategories: CATEGORY_SUBCATEGORIES["autopilot-settings"],
  },
  {
    id: "future-plans",
    title: "Future Plans",
    icon: Sparkles,
    gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
    defaultInsight: "Designing your evolution",
    subcategories: CATEGORY_SUBCATEGORIES["future-plans"],
  },
  {
    id: "general",
    title: "Uncategorized",
    icon: FolderOpen,
    gradient: "bg-gradient-to-br from-gray-400 to-gray-600",
    defaultInsight: "Memories awaiting categorization",
    subcategories: CATEGORY_SUBCATEGORIES["general"],
  },
];

export function MemoryCategoryGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCategoryDetailOpen, setIsCategoryDetailOpen] = useState(false);
  const { metadata, isLoading, refreshMetadata, isRefreshing, getCategoryProgress } = useMemoryMetadata();

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsCategoryDetailOpen(true);
  };

  const handleAddMemory = () => {
    setIsCategoryDetailOpen(false);
    setIsAddDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refreshMetadata();
    notifySuccess('toasts.memory.memoryGardenUpdated');
  };

  const selectedCategoryData = MEMORY_CATEGORIES.find(
    (cat) => cat.id === selectedCategory
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('screens.memory.memoryGarden')}</h2>
          <p className="text-sm text-muted-foreground">
            {metadata?.total_memories_count || 0} total memories across all categories
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
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
          const memoryCount = progress?.memoryCount || 0;

          return (
            <MemoryCategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              progress={progress?.progress || 0}
              memoryCount={memoryCount}
              insight={progress?.lastUpdated 
                ? `Last updated ${new Date(progress.lastUpdated).toLocaleDateString()}`
                : category.defaultInsight
              }
              gradient={category.gradient}
              onClick={() => handleCategoryClick(category.id)}
            />
          );
        })}
      </div>

      {selectedCategoryData && (
        <CategoryDetailDialog
          open={isCategoryDetailOpen}
          onOpenChange={setIsCategoryDetailOpen}
          category={selectedCategoryData}
          onAddMemory={handleAddMemory}
        />
      )}

      <AddMemoryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        defaultCategory={selectedCategory || undefined}
      />
    </div>
  );
}
