import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
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
}

export function ExpandableSearchButton({ 
  placeholder, 
  onSearch,
  onClear,
  dropdownItems,
  onItemClick,
  className 
}: ExpandableSearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { translate } = useTranslation();

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
      <div ref={wrapperRef} className={cn("relative w-64", className)}>
        <form onSubmit={handleSearch}>
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

        {/* Search results dropdown */}
        {showDropdown && hasDropdownContent && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
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
          </div>
        )}
      </div>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleExpand}
      className={cn(
        "h-9 px-3 rounded-full bg-muted/60 hover:bg-muted text-foreground gap-1.5 shrink-0 transition-all duration-300 ease-in-out",
        className
      )}
    >
      <Search className="w-4 h-4" />
      <span className="text-sm">{translate('actionBar.search', 'Search')}</span>
    </Button>
  );
}
