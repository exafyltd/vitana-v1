import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, MessageSquare, Video, Calendar, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  type: 'person' | 'group' | 'content' | 'health';
  title: string;
  subtitle?: string;
  avatar?: string;
}

const mockSuggestions: SearchSuggestion[] = [
  { id: '1', type: 'person', title: 'Sarah Miller', subtitle: 'Yoga Enthusiast', avatar: '/lovable-uploads/sarah-miller-avatar.jpg' },
  { id: '2', type: 'person', title: 'Dr. Roberts', subtitle: 'Health Coach', avatar: '/lovable-uploads/dr-roberts-avatar.jpg' },
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
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const filtered = mockSuggestions.filter(suggestion =>
        suggestion.title.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.subtitle?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query]);

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Check if it's a person's name from suggestions
      const personMatch = mockSuggestions.find(
        s => s.type === 'person' && 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (personMatch) {
        navigate(`/profile/${personMatch.id}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
      setQuery('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'person') {
      navigate(`/profile/${suggestion.id}`);
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
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search members, groups, content…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
            if (e.key === 'Escape') {
              setShowSuggestions(false);
              inputRef.current?.blur();
            }
          }}
          className={cn(
            "w-full pl-10 pr-4 py-2 text-sm rounded-lg",
            "bg-sidebar-accent/50 border border-sidebar-border/50",
            "text-sidebar-foreground placeholder:text-sidebar-foreground/50",
            "focus:bg-sidebar-accent focus:border-sidebar-ring/50 focus:outline-none focus:ring-2 focus:ring-sidebar-ring/20",
            "hover:bg-sidebar-accent/70 transition-colors"
          )}
        />
        {!open && query && (
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

      {/* Search Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar-background border border-sidebar-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="ghost"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full justify-start p-3 h-auto rounded-none hover:bg-sidebar-accent/50 border-b border-sidebar-border/30 last:border-b-0"
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
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                      {getTypeIcon(suggestion.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sidebar-foreground text-sm">
                    {suggestion.title}
                  </div>
                  {suggestion.subtitle && (
                    <div className="text-xs text-sidebar-foreground/60">
                      {suggestion.subtitle}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-sidebar-foreground/40">
                  {getTypeIcon(suggestion.type)}
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}