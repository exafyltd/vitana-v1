import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Users, MessageSquare, Video, Calendar, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { members, loading, searchMembers, getDisplayName } = useCommunityMembers();

  // Trigger search when query changes
  useEffect(() => {
    if (query.trim() && open) {
      console.log('GlobalSearch: Searching for:', query);
      searchMembers(query);
    }
  }, [query, open, searchMembers]);

  // Update suggestions when members data changes
  useEffect(() => {
    console.log('GlobalSearch: Members updated:', members.length, 'members, query:', query);
    if (query.trim() && open) {
      const memberSuggestions: SearchSuggestion[] = members.map(member => {
        const displayName = member.display_name || member.full_name || 'Unknown User';
        return {
          id: member.user_id,
          type: 'person' as const,
          title: displayName,
          subtitle: 'Community Member',
          avatar: member.avatar_url || undefined
        };
      });

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
      setFilteredSuggestions([]);
    }
  }, [members, query, open]);

  // Update dropdown position when showing
  useEffect(() => {
    if (showSuggestions && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showSuggestions, filteredSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputClick = () => {
    if (!open) {
      navigate('/search');
    } else {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      e.preventDefault();
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
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logSearch } = useCommunityLogger();
        logSearch(searchQuery, 'all', filteredSuggestions.length);
      });
      
      const member = members.find(m => {
        const displayName = m.display_name || m.full_name || 'Unknown User';
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
      });
      if (member) {
        const memberHandle = member.handle;
        if (memberHandle) {
          navigate(`/u/@${memberHandle}`);
        } else {
          navigate(`/u/${member.user_id}`);
        }
        setQuery('');
        setShowSuggestions(false);
        inputRef.current?.blur();
        return;
      }
      
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setQuery('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
      const { logSearchMember, logSearchGroup } = useCommunityLogger();
      if (suggestion.type === 'person') {
        logSearchMember(suggestion.title, 1);
      } else if (suggestion.type === 'group') {
        logSearchGroup(suggestion.title, 1);
      }
    });
    
    if (suggestion.type === 'person') {
      const member = members.find(m => m.user_id === suggestion.id);
      if (member && member.handle) {
        navigate(`/u/@${member.handle}`);
      } else {
        navigate(`/u/${suggestion.id}`);
      }
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

  const hasDropdown = showSuggestions && filteredSuggestions.length > 0 && open && dropdownPos;

  return (
    <>
      <div ref={wrapperRef} className="relative w-full">
        {open ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search members, groups, content…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim() && filteredSuggestions.length > 0) setShowSuggestions(true);
              }}
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
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

      {hasDropdown && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 50 }}
          className="bg-popover border border-border shadow-lg rounded-lg overflow-hidden"
        >
          <ScrollArea className="max-h-80">
            <div className="py-1">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                  }}
                  className={cn(
                    "w-full p-3 cursor-pointer",
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
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>,
        document.body
      )}
    </>
  );
}
