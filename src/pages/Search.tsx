import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Users, MessageSquare, Video, Heart, Clock, Play, BookOpen } from "lucide-react";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";

interface SearchResult {
  id: string;
  type: 'people' | 'groups' | 'content' | 'health';
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: string;
  thumbnail?: string;
  members?: number;
  duration?: string;
  views?: string;
  category?: string;
}

// Mock content and groups for other search types
const mockContentResults: SearchResult[] = [
  {
    id: '4',
    type: 'content',
    title: '10-Minute Morning Meditation',
    subtitle: 'Start your day mindfully',
    description: 'A gentle guided meditation to center yourself before the day begins.',
    thumbnail: '/lovable-uploads/meditation-thumbnail.jpg',
    duration: '10:42',
    views: '2.1k views',
    category: 'Meditation'
  },
  {
    id: '5',
    type: 'content',
    title: 'Healthy Breakfast Ideas',
    subtitle: 'Nutritious morning meals',
    description: 'Quick and easy breakfast recipes to fuel your body for the day.',
    thumbnail: '/lovable-uploads/breakfast-thumbnail.jpg',
    duration: '8:15',
    views: '1.8k views',
    category: 'Nutrition'
  }
];

const mockGroupResults: SearchResult[] = [
  {
    id: '3',
    type: 'groups',
    title: 'Mindful Living Community',
    subtitle: 'Daily mindfulness practices',
    description: 'A supportive community focused on incorporating mindfulness into everyday life.',
    members: 1200,
    category: 'Mindfulness'
  },
  {
    id: '8',
    type: 'groups',
    title: 'Healthy Cooking Club',
    subtitle: 'Nutritious recipe sharing',
    description: 'Share and discover delicious healthy recipes with fellow cooking enthusiasts.',
    members: 850,
    category: 'Nutrition'
  }
];

const mockHealthResults: SearchResult[] = [
  {
    id: '6',
    type: 'health',
    title: 'Sleep Quality Tips',
    subtitle: 'Improve your rest',
    description: 'Evidence-based strategies to enhance your sleep quality and duration.',
    category: 'Sleep & Recovery'
  }
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const { members, loading, searchMembers, getDisplayName, getInitials } = useCommunityMembers();

  useEffect(() => {
    if (query.trim()) {
      console.log('Search: Searching for:', query);
      searchMembers(query);
    }
  }, [query, searchMembers]);

  useEffect(() => {
    console.log('Search: Members updated:', members.length, 'members for query:', query);
    
    // Convert community members to search results
    const memberResults: SearchResult[] = members.map(member => ({
      id: member.user_id,
      type: 'people' as const,
      title: getDisplayName(member),
      subtitle: 'Community Member',
      description: 'Active member of the VITANA community',
      avatar: member.avatar_url || undefined
    }));

    // Filter other content based on query
    let otherResults: SearchResult[] = [];
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      
      const filteredContent = mockContentResults.filter(item =>
        item.title.toLowerCase().includes(queryLower) ||
        item.subtitle?.toLowerCase().includes(queryLower) ||
        item.description?.toLowerCase().includes(queryLower)
      );
      
      const filteredGroups = mockGroupResults.filter(item =>
        item.title.toLowerCase().includes(queryLower) ||
        item.subtitle?.toLowerCase().includes(queryLower) ||
        item.description?.toLowerCase().includes(queryLower)
      );
      
      const filteredHealth = mockHealthResults.filter(item =>
        item.title.toLowerCase().includes(queryLower) ||
        item.subtitle?.toLowerCase().includes(queryLower) ||
        item.description?.toLowerCase().includes(queryLower)
      );

      otherResults = [...filteredContent, ...filteredGroups, ...filteredHealth];
    }

    let allResults = [...memberResults, ...otherResults];

    // Filter by active tab
    if (activeTab !== 'all') {
      allResults = allResults.filter(result => result.type === activeTab);
    }

    console.log('Search: Final results:', allResults.map(r => r.title));
    setResults(allResults);
  }, [members, query, activeTab, getDisplayName]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log search activity
    import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
      const { logSearch, logSearchMember, logSearchGroup } = useCommunityLogger();
      const resultsCount = results.filter(r => activeTab === 'all' || r.type === activeTab).length;
      
      if (activeTab === 'people') {
        logSearchMember(query, resultsCount);
      } else if (activeTab === 'groups') {
        logSearchGroup(query, resultsCount);
      } else {
        logSearch(query, activeTab, resultsCount);
      }
    });
    
    setSearchParams({ q: query, type: activeTab });
  };

  const getResultCount = (type: string) => {
    if (type === 'all') return results.length;
    
    // Count real members + mock data for each type
    const memberCount = members.length;
    const mockCounts = {
      people: memberCount,
      groups: mockGroupResults.length,
      content: mockContentResults.length,
      health: mockHealthResults.length
    };
    
    return mockCounts[type as keyof typeof mockCounts] || 0;
  };

  const renderResultCard = (result: SearchResult) => {
    switch (result.type) {
      case 'people':
        return (
          <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={result.avatar} alt={result.title} />
                  <AvatarFallback>{getInitials({ user_id: result.id, display_name: result.title, full_name: null, email: null, handle: null, avatar_url: result.avatar })}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{result.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80">{result.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/u/${result.id}`)}>View Profile</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/u/${result.id}`, { state: { openMessage: true } })}>Message</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'groups':
        return (
          <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{result.title}</h3>
                    {result.category && <Badge variant="secondary">{result.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{result.members?.toLocaleString()} members</span>
                    </div>
                    <Button size="sm" variant="outline">Join Group</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'content':
        return (
          <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {result.thumbnail ? (
                    <img src={result.thumbnail} alt={result.title} className="object-cover w-full h-full" />
                  ) : (
                    <Play className="h-6 w-6 text-muted-foreground" />
                  )}
                  {result.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {result.duration}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{result.title}</h3>
                    {result.category && <Badge variant="secondary">{result.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {result.views && (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          <span>{result.views}</span>
                        </div>
                      )}
                      {result.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{result.duration}</span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline">Watch</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'health':
        return (
          <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{result.title}</h3>
                    {result.category && <Badge variant="secondary">{result.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={`Search Results for "${query}" - VITANA`}
        description={`Find members, groups, content, and health resources matching "${query}" on VITANA.`}
      />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search Header */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search members, groups, content…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
          
          {query && (
            <p className="text-sm text-muted-foreground">
              Showing results for "<span className="font-medium">{query}</span>"
            </p>
          )}
        </div>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              🔍 All
              <Badge variant="secondary" className="ml-1">
                {getResultCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-2">
              👥 People
              <Badge variant="secondary" className="ml-1">
                {getResultCount('people')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              💬 Groups
              <Badge variant="secondary" className="ml-1">
                {getResultCount('groups')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              🎬 Content
              <Badge variant="secondary" className="ml-1">
                {getResultCount('content')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              ❤️ Health
              <Badge variant="secondary" className="ml-1">
                {getResultCount('health')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {results.length > 0 ? (
                results.map(renderResultCard)
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or browse different categories.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-6">
            <div className="space-y-4">
              {results.filter(r => r.type === 'people').map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <div className="space-y-4">
              {results.filter(r => r.type === 'groups').map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <div className="space-y-4">
              {results.filter(r => r.type === 'content').map(renderResultCard)}
            </div>
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <div className="space-y-4">
              {results.filter(r => r.type === 'health').map(renderResultCard)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}