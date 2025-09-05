import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  removable?: boolean;
}

interface SearchFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterChip[];
  onFilterRemove?: (filterId: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}

export function SearchFilterBar({
  searchValue = "",
  onSearchChange,
  filters = [],
  onFilterRemove,
  placeholder = "Search...",
  showFilters = true,
  className
}: SearchFilterBarProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
        />
      </div>

      {/* Filter Chips */}
      {showFilters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="h-8 px-3 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <span className="truncate max-w-32">{filter.label}</span>
              {filter.removable !== false && onFilterRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                  onClick={() => onFilterRemove(filter.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}