import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export interface SearchDropdownItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

interface ExpandableSearchButtonProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  dropdownItems?: SearchDropdownItem[];
  onItemClick?: (id: string) => void;
  className?: string;
  /** Optional inline filter chip label, e.g. "🔥 Hot" */
  filterLabel?: string;
  /** Called when the filter chip portion is tapped */
  onFilterClick?: () => void;
  /**
   * Optional filter trigger rendered *only while the search is expanded*,
   * as a trailing icon next to the input. Lets a page hang its filter
   * sheet off Search instead of a separate utility-bar button.
   */
  onFilterToggle?: () => void;
  /** Active-filter count shown as a badge on the expanded filter icon. */
  filterActiveCount?: number;
}

export function ExpandableSearchButton({ 
  placeholder, 
  onSearch,
  onClear,
  dropdownItems,
  onItemClick,
  className,
  filterLabel,
  onFilterClick,
  onFilterToggle,
  filterActiveCount,
}: ExpandableSearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { translate } = useTranslation();

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Update dropdown position
  useEffect(() => {
    if (showDropdown && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showDropdown, searchQuery]);

  // Close dropdown on outside click (check both wrapper and portal dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery("");
    setShowDropdown(false);
    onSearch?.("");
    onClear?.();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      handleCollapse();
    }
  };

  const handleItemClick = (id: string) => {
    onItemClick?.(id);
    handleCollapse();
  };

  const hasDropdownContent = dropdownItems && dropdownItems.length > 0 && searchQuery.trim().length > 0;

  if (isExpanded) {
    return (
      <>
        <div ref={wrapperRef} className={cn("relative flex items-center gap-1.5", className)}>
          <form onSubmit={handleSearch} className="relative w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                  setShowDropdown(e.target.value.trim().length > 0);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || `${translate('actionBar.search', 'Search')}…`}
                className="pl-10 pr-10 h-9 rounded-lg transition-all duration-300 ease-in-out"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </form>
          {onFilterToggle && (
            <button
              type="button"
              onClick={onFilterToggle}
              aria-label={translate('actionBar.filters', 'Filters')}
              className="relative flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background hover:bg-muted shrink-0 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filterActiveCount ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                  {filterActiveCount}
                </span>
              ) : null}
            </button>
          )}
        </div>

        {/* Search results dropdown via portal */}
        {showDropdown && hasDropdownContent && dropdownPos && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            className="z-50 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {dropdownItems.map((item) => (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleItemClick(item.id);
                }}
                className="px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center h-9 rounded-full bg-muted/60 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        className
      )}
    >
      <button 
        type="button"
        onClick={handleExpand}
        className="flex items-center gap-1 px-2.5 h-full hover:bg-muted/80 transition-colors rounded-l-full"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{translate('actionBar.search', 'Search')}</span>
      </button>
      {filterLabel && onFilterClick && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <button
            type="button"
            onClick={onFilterClick}
            className="flex items-center gap-1 px-2.5 pr-3 h-full hover:bg-muted/80 transition-colors rounded-r-full"
          >
            <span className="text-sm font-medium">{filterLabel}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
