import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, MessageSquare, Video, Calendar, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";

interface SearchSuggestion {
  id: string;
  type: 'person' | 'group' | 'content' | 'health';
  title: string;
  subtitle?: string;
  avatar?: string;
}

// Mock content suggestions for non-member searches
const mockContentSuggestions: SearchSuggestion[] = [
  { id: '3', type: 'group', title: 'Mindful Living', subtitle: '1.2k members' },
  { id: '4', type: 'content', title: '10-Minute Morning Meditation', subtitle: 'Video • 2.1k views' },
  { id: '5', type: 'health', title: 'Sleep Quality Tips', subtitle: 'Health Topic' },
];

interface GlobalSearchProps {
  open: boolean;
}

export function GlobalSearch({ open }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { members, loading, searchMembers, getDisplayName } = useCommunityMembers();

  useEffect(() => {
    if (query.trim() && open) {
      // Search for community members
      searchMembers(query);
      
      // Combine member results with content suggestions
      const memberSuggestions: SearchSuggestion[] = members.map(member => ({
        id: member.user_id,
        type: 'person' as const,
        title: getDisplayName(member),
        subtitle: 'Community Member',
        avatar: member.avatar_url || undefined
      }));

      // Filter content suggestions based on query
      const contentSuggestions = mockContentSuggestions.filter(suggestion =>
        suggestion.title.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.subtitle?.toLowerCase().includes(query.toLowerCase())
      );

      const allSuggestions = [...memberSuggestions, ...contentSuggestions];
      setFilteredSuggestions(allSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [query, open, members, searchMembers, getDisplayName]);

  const handleInputClick = () => {
    if (!open) {
      // Can't control sidebar from here, just focus input
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      e.preventDefault();
      // Can't control sidebar from here
      return;
    }

    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // First try to find as community member
      const member = members.find(m => 
        getDisplayName(m).toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (member) {
        // Navigate to member profile - assuming we use user_id for routing
        navigate(`/u/${member.user_id}`);
        setQuery('');
        setShowSuggestions(false);
        inputRef.current?.blur();
        return;
      }
      
      // Fallback to general search
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setQuery('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'person') {
      // Navigate to member profile using user_id
      navigate(`/u/${suggestion.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.title)}&type=${suggestion.type}`);
    }
    setQuery('');
    setShowSuggestions(false);
  };

  const getTypeIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'person': return <Users className="h-4 w-4" />;
      case 'group': return <MessageSquare className="h-4 w-4" />;
      case 'content': return <Video className="h-4 w-4" />;
      case 'health': return <Heart className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={showSuggestions && filteredSuggestions.length > 0 && open} onOpenChange={setShowSuggestions}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          {open ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search members, groups, content…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full pl-10 pr-4 py-2 text-sm rounded-lg",
                  "bg-sidebar-accent/50 border border-sidebar-border/50",
                  "text-sidebar-foreground placeholder:text-sidebar-foreground/50",
                  "focus:bg-sidebar-accent focus:border-sidebar-ring/50 focus:outline-none focus:ring-2 focus:ring-sidebar-ring/20",
                  "hover:bg-sidebar-accent/70 transition-colors"
                )}
              />
              {query && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSearch()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <Search className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInputClick}
              className="w-10 h-10 rounded-lg hover:bg-sidebar-accent/70 transition-colors"
              title="Search"
            >
              <Search className="h-4 w-4 text-sidebar-foreground/70" />
            </Button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 mt-2 bg-popover border border-border shadow-lg rounded-lg z-50"
        align="start"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-80">
          <div className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <Button
                key={suggestion.id}
                variant="ghost"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "w-full justify-start p-3 h-auto rounded-none",
                  "hover:bg-accent/50 border-b border-border/30 last:border-b-0",
                  selectedIndex === index && "bg-accent/70"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">
                    {suggestion.avatar ? (
                      <img 
                        src={suggestion.avatar} 
                        alt={suggestion.title}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {getTypeIcon(suggestion.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground text-sm">
                      {suggestion.title}
                    </div>
                    {suggestion.subtitle && (
                      <div className="text-xs text-muted-foreground">
                        {suggestion.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getTypeIcon(suggestion.type)}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}