import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEV_HUB_CONFIG } from "@/config/dev-config";
import { t } from '@/lib/i18n-toast';

interface SavedFilter {
  id: string;
  name: string;
  description: string;
  resultCount: number;
  criteria: {
    status?: string;
    agent?: string;
    dateRange?: string;
  };
}

const MOCK_FILTERS: SavedFilter[] = [
  {
    id: "filter_001",
    name: "Failed Deployments",
    description: "All failed deployment commands in the last 7 days",
    resultCount: 3,
    criteria: {
      status: "failed",
      agent: "system.autopilot",
      dateRange: "7d",
    },
  },
  {
    id: "filter_002",
    name: "User Commands",
    description: "Commands initiated by admin users this month",
    resultCount: 12,
    criteria: {
      agent: "user",
      dateRange: "30d",
    },
  },
  {
    id: "filter_003",
    name: "Long Running Tasks",
    description: "Commands with duration > 5 minutes",
    resultCount: 8,
    criteria: {
      dateRange: "7d",
    },
  },
  {
    id: "filter_004",
    name: "Autopilot Success Rate",
    description: "All autopilot executions by status",
    resultCount: 47,
    criteria: {
      agent: "system.autopilot",
      dateRange: "30d",
    },
  },
];

export function FilteredView() {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const handleFilterClick = (filterId: string) => {
    setSelectedFilter(filterId === selectedFilter ? null : filterId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card className="p-4 bg-white/50 dark:bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('screens.dev.savedFilters')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('screens.dev.quickAccessPreconfiguredQueryFilters')}
            </p>
          </div>
          <Button
            size="sm"
            disabled={DEV_HUB_CONFIG.readonly}
            title={
              DEV_HUB_CONFIG.readonly
                ? "Filter creation disabled in read-only mode"
                : "Create new filter"
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.dev.createNewFilter')}
          </Button>
        </div>
      </Card>

      {/* Filter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_FILTERS.map((filter) => (
          <Card
            key={filter.id}
            className={cn(
              "cursor-pointer transition-all duration-200 bg-white/50 dark:bg-card/50 backdrop-blur-sm hover:shadow-lg hover:scale-[1.02]",
              selectedFilter === filter.id &&
                "ring-2 ring-primary shadow-lg scale-[1.02]"
            )}
            onClick={() => handleFilterClick(filter.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10 mt-1">
                    <Filter className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base mb-1">
                      {filter.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {filter.description}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filter.resultCount} results
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {filter.criteria.status && (
                  <Badge variant="outline" className="text-xs">
                    Status: {filter.criteria.status}
                  </Badge>
                )}
                {filter.criteria.agent && (
                  <Badge variant="outline" className="text-xs">
                    Agent: {filter.criteria.agent}
                  </Badge>
                )}
                {filter.criteria.dateRange && (
                  <Badge variant="outline" className="text-xs">
                    Last {filter.criteria.dateRange}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Panel */}
      {selectedFilter && (
        <Card className="bg-white/50 dark:bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    {MOCK_FILTERS.find((f) => f.id === selectedFilter)?.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('screens.dev.showingFilteredResultsBelow')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFilter(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg bg-muted/30 p-8 text-center border border-border/50">
              <p className="text-sm text-muted-foreground">
                {t('screens.dev.filteredResultsWouldAppearHereProduction')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('screens.dev.thisWillDisplayTableSimilarExecution')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
