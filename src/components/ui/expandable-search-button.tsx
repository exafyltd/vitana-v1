import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ExpandableSearchButtonProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function ExpandableSearchButton({ 
  placeholder = "Search…", 
  onSearch,
  className 
}: ExpandableSearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCollapse();
    }
  };

  if (isExpanded) {
    return (
      <form onSubmit={handleSearch} className={cn("relative w-64", className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
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
      <span className="text-sm">Search</span>
    </Button>
  );
}