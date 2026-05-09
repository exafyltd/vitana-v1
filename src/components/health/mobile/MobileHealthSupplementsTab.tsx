import { useState } from "react";
import { Loader2, Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserSupplements } from "@/hooks/useUserSupplements";
import { SupplementCard } from "@/components/supplements/SupplementCard";

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
                ? 'bg-pill-nutrition-tint text-pill-nutrition-accent'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Supplements list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 border border-border p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {translate('health.noSupplements')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            {translate('health.noSupplementsDesc')}
          </p>
          <Button size="sm" className="rounded-full gap-1.5">
            <Plus className="h-4 w-4" />
            {translate('health.addSupplement')}
          </Button>
        </div>
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
