import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pill } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserSupplements } from "@/hooks/useUserSupplements";
import { SupplementCard } from "@/components/supplements/SupplementCard";
import { I18nEmptyState } from "@/components/ui/i18n-empty-state";

const CATEGORY_FILTERS = ['All', 'Vitamins', 'Minerals', 'Amino Acids', 'Adaptogens', 'Probiotics', 'Antioxidants', 'Other'];

export function MobileHealthSupplementsTab() {
  const { translate } = useTranslation();
  const { supplements, isLoading, deleteSupplement } = useUserSupplements();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? supplements
    : supplements.filter(s => s.category.toLowerCase().includes(activeFilter.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeFilter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Supplements list */}
      {filtered.length === 0 ? (
        <I18nEmptyState
          Icon={Pill}
          titleKey="health.noSupplements"
          descriptionKey="health.noSupplementsDesc"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(supplement => (
            <SupplementCard
              key={supplement.id}
              supplement={supplement}
              onEdit={() => {/* TODO: open edit sheet */}}
              onDelete={deleteSupplement}
            />
          ))}
        </div>
      )}
    </div>
  );
}
