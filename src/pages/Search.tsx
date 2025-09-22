import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Users, MessageSquare, Video, Heart, Clock, Play, BookOpen } from "lucide-react";

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

const mockResults: SearchResult[] = [
  {
    id: '1',
    type: 'people',
    title: 'Sarah Miller',
    subtitle: 'Yoga Enthusiast & Meditation Teacher',
    description: 'Helping people find peace through mindful movement and breathing techniques.',
    avatar: '/lovable-uploads/sarah-miller-avatar.jpg'
  },
  {
    id: '2',
    type: 'people',
    title: 'Dr. Roberts',
    subtitle: 'Certified Health Coach',
    description: 'Specializing in holistic wellness and preventive healthcare approaches.',
    avatar: '/lovable-uploads/dr-roberts-avatar.jpg'
  },
  {
    id: '3',
    type: 'groups',
    title: 'Mindful Living Community',
    subtitle: 'Daily mindfulness practices',
    description: 'A supportive community focused on incorporating mindfulness into everyday life.',
    members: 1200,
    category: 'Mental Health'
  },
  {
    id: '4',
    type: 'content',
    title: '10-Minute Morning Meditation',
    subtitle: 'Start your day with intention',
    description: 'A gentle guided meditation to center yourself before beginning your day.',
    duration: '10:23',
    views: '2.1k',
    category: 'Mental Health'
  },
  {
    id: '5',
    type: 'health',
    title: 'Sleep Quality Optimization',
    subtitle: 'Improve your rest and recovery',
    description: 'Evidence-based strategies for better sleep hygiene and restorative rest.',
    category: 'Sleep Health'
  }
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    // Filter results based on query and tab
    let filtered = mockResults;
    
    if (query.trim()) {
      filtered = filtered.filter(result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (activeTab !== 'all') {
      filtered = filtered.filter(result => result.type === activeTab);
    }

    setResults(filtered);
  }, [query, activeTab]);

  const handleSearch = () => {
    if (query.trim()) {
      setSearchParams({ q: query, ...(activeTab !== 'all' && { type: activeTab }) });
    }
  };

  const getResultCount = (type: string) => {
    if (type === 'all') return results.length;
    return mockResults.filter(r => r.type === type).length;
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
                  <AvatarFallback>{result.title.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{result.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80">{result.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">View Profile</Button>
                    <Button size="sm" variant="ghost">Message</Button>
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
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{result.members?.toLocaleString()} members</span>
                    </div>
                    <Button size="sm">Join Group</Button>
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
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{result.title}</h3>
                    {result.category && <Badge variant="secondary">{result.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{result.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      <span>{result.views} views</span>
                    </div>
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
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{result.title}</h3>
                    {result.category && <Badge variant="secondary">{result.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>
                  <Button size="sm" variant="outline">Learn More</Button>
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
        title="Search - VITANA"
        description="Search for people, groups, content, and health topics in the VITANA community"
      />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search members, groups, content…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {query && (
            <div className="text-sm text-muted-foreground">
              Showing results for "{query}" ({results.length} found)
            </div>
          )}
        </div>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({getResultCount('all')})
            </TabsTrigger>
            <TabsTrigger value="people">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                People ({getResultCount('people')})
              </div>
            </TabsTrigger>
            <TabsTrigger value="groups">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Groups ({getResultCount('groups')})
              </div>
            </TabsTrigger>
            <TabsTrigger value="content">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Content ({getResultCount('content')})
              </div>
            </TabsTrigger>
            <TabsTrigger value="health">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Health Topics ({getResultCount('health')})
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map(renderResultCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or exploring different categories.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}