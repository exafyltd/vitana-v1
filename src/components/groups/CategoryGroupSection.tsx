import { UnifiedGroupCard } from "@/types/community";
import { GroupImageCard } from "./GroupImageCard";
import { CategoryTheme } from "@/lib/categoryThemes";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryGroupSectionProps {
  category: string;
  icon: string;
  groups: UnifiedGroupCard[];
  theme: CategoryTheme;
  onGroupClick: (group: UnifiedGroupCard) => void;
}

export function CategoryGroupSection({
  category,
  icon,
  groups,
  theme,
  onGroupClick
}: CategoryGroupSectionProps) {
  if (!groups || groups.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {category} Groups
        </h3>
        <p className="text-sm text-muted-foreground">Based on your interests</p>
      </div>

      {/* Horizontal Scrollable Cards */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {groups.map((group) => (
            <div key={group.id} className="w-[280px] flex-shrink-0">
              <GroupImageCard
                group={group}
                variant="full"
                showMatchScore={true}
                categoryTheme={theme}
                onClick={onGroupClick}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
