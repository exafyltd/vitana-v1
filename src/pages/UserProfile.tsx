import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  UserPlus, 
  MapPin, 
  Calendar,
  Heart,
  Trophy,
  Star,
  Users,
  Activity,
  Target,
  Play,
  Music,
  Headphones,
  Video,
  Camera,
  Bookmark,
  Share,
  MoreHorizontal
} from "lucide-react";

interface MediaContent {
  id: string;
  type: 'video' | 'podcast' | 'music';
  title: string;
  thumbnail: string;
  duration: string;
  views?: number;
  plays?: number;
  date: string;
}

interface Community {
  id: string;
  name: string;
  members: number;
  type: 'group' | 'event';
  role?: 'member' | 'admin' | 'moderator';
}

interface SocialPost {
  id: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  date: string;
  type: 'text' | 'image' | 'video';
}

interface UserProfile {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  location: string;
  joinDate: string;
  avatar: string;
  coverImage?: string;
  verified: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
    vitanaScore: number;
    mediaUploads: number;
    groupsJoined: number;
  };
  badges: string[];
  interests: string[];
  longevityArchetype: string;
  communities: Community[];
  mediaContent: MediaContent[];
  socialPosts: SocialPost[];
  engagementBadges: string[];
}

const mockUsers: Record<string, UserProfile> = {
  '1': {
    id: '1',
    name: 'Sarah Miller',
    handle: '@sarahwellness',
    tagline: 'Yoga Enthusiast & Meditation Teacher ✨',
    bio: 'Passionate about helping others find inner peace through mindful movement and breathing techniques. Certified yoga instructor with 8+ years of experience in holistic wellness.',
    location: 'San Francisco, CA',
    joinDate: 'March 2023',
    avatar: '/lovable-uploads/sarah-miller-avatar.jpg',
    verified: true,
    stats: {
      posts: 142,
      followers: 1250,
      following: 380,
      vitanaScore: 784,
      mediaUploads: 24,
      groupsJoined: 8
    },
    badges: ['Mindfulness Master', 'Community Helper', 'Wellness Warrior'],
    interests: ['Yoga', 'Meditation', 'Mental Health', 'Nutrition', 'Nature'],
    longevityArchetype: 'The Mindful Mover',
    engagementBadges: ['Posted 20+ videos', 'Joined 5+ groups', 'Daily meditation streak'],
    communities: [
      { id: '1', name: 'Mindful Movement', members: 1250, type: 'group', role: 'admin' },
      { id: '2', name: 'Morning Yoga Sessions', members: 850, type: 'event', role: 'member' },
      { id: '3', name: 'Wellness Warriors', members: 2100, type: 'group', role: 'moderator' }
    ],
    mediaContent: [
      {
        id: '1',
        type: 'video',
        title: '15-Minute Morning Flow',
        thumbnail: '/lovable-uploads/sarah-miller-avatar.jpg',
        duration: '15:23',
        views: 2300,
        date: '2 days ago'
      },
      {
        id: '2',
        type: 'podcast',
        title: 'Finding Inner Peace',
        thumbnail: '/lovable-uploads/sarah-miller-avatar.jpg',
        duration: '32:15',
        plays: 890,
        date: '1 week ago'
      }
    ],
    socialPosts: [
      {
        id: '1',
        content: 'Starting the day with gratitude and gentle movement. Remember, progress over perfection! 🧘‍♀️',
        likes: 87,
        comments: 12,
        shares: 5,
        date: '3 hours ago',
        type: 'text'
      },
      {
        id: '2',
        content: 'Just finished teaching an amazing sunrise yoga session. The energy was incredible! 🌅',
        image: '/lovable-uploads/sarah-miller-avatar.jpg',
        likes: 156,
        comments: 23,
        shares: 11,
        date: '1 day ago',
        type: 'image'
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Dr. Roberts',
    handle: '@drroberts_md',
    tagline: 'Certified Health Coach & Preventive Medicine Doctor 🩺',
    bio: 'Board-certified physician specializing in preventive medicine and holistic wellness. Passionate about empowering individuals to take control of their health journey.',
    location: 'Austin, TX',
    joinDate: 'January 2023',
    avatar: '/lovable-uploads/dr-roberts-avatar.jpg',
    verified: true,
    stats: {
      posts: 89,
      followers: 2150,
      following: 156,
      vitanaScore: 96,
      mediaUploads: 15,
      groupsJoined: 5
    },
    badges: ['Health Expert', 'Verified Professional', 'Top Contributor'],
    interests: ['Preventive Medicine', 'Nutrition Science', 'Sleep Health', 'Exercise Physiology'],
    longevityArchetype: 'The Science-Based Optimizer',
    engagementBadges: ['100+ consultations', 'Evidence-based content creator', 'Health community leader'],
    communities: [
      { id: '4', name: 'Evidence-Based Health', members: 3200, type: 'group', role: 'admin' },
      { id: '5', name: 'Heart Health Workshop', members: 450, type: 'event', role: 'member' }
    ],
    mediaContent: [
      {
        id: '3',
        type: 'video',
        title: 'Heart Health Fundamentals',
        thumbnail: '/lovable-uploads/dr-roberts-avatar.jpg',
        duration: '18:45',
        views: 4200,
        date: '1 day ago'
      }
    ],
    socialPosts: [
      {
        id: '3',
        content: 'New research shows that even 10 minutes of daily movement can significantly impact cardiovascular health. Small steps, big results! 💪',
        likes: 203,
        comments: 45,
        shares: 28,
        date: '6 hours ago',
        type: 'text'
      }
    ]
  }
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = id ? mockUsers[id] : null;

  if (!user) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground">The profile you're looking for doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'podcast': return <Headphones className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-primary/10 text-primary';
      case 'moderator': return 'bg-secondary/10 text-secondary';
      default: return 'bg-accent/10 text-accent';
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={`${user.name} - VITANA`}
        description={`${user.name}: ${user.bio}`}
      />

      <div className="space-y-8">
        {/* Hero Section with Vitana Index as Star */}
        <div className="relative bg-gradient-to-br from-green-400/10 via-blue-500/10 to-purple-500/10 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          
          <div className="relative p-8">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Left: Avatar & Basic Info */}
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl mb-4">
                  <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center">
                    <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
                    {user.verified && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Star className="h-4 w-4 mr-1 fill-current" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground font-medium">{user.handle}</p>
                  <p className="text-foreground/80">{user.tagline}</p>
                </div>
              </div>

              {/* Center: Giant Vitana Index - The Star of the Show */}
              <div 
                className="flex-1 flex flex-col items-center cursor-pointer group transition-all duration-500 hover:scale-105"
                onClick={() => navigate('/health-tracker/vitana-index')}
              >
                <div className="relative">
                  {/* Glowing background circle */}
                  <div className="absolute inset-0 w-48 h-48 rounded-full bg-gradient-to-br from-green-400/20 to-blue-500/20 blur-xl group-hover:blur-2xl transition-all duration-500" />
                  
                  {/* Main circle */}
                  <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-2xl shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-500 border-4 border-white/20">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-green-600 mb-2 group-hover:scale-110 transition-transform duration-300">
                        {user.stats.vitanaScore}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                        Vitana Index
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating achievement badge */}
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Top 10%
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-bold text-foreground mb-1">{user.longevityArchetype}</h3>
                  <p className="text-sm text-muted-foreground">Longevity Archetype</p>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{user.stats.followers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{user.stats.posts}</div>
                  <div className="text-xs text-muted-foreground">Posts</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{user.stats.mediaUploads}</div>
                  <div className="text-xs text-muted-foreground">Media</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{user.stats.groupsJoined}</div>
                  <div className="text-xs text-muted-foreground">Groups</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center mt-8">
              <Button size="lg" className="px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </Button>
              <Button variant="ghost" size="lg">
                <Share className="h-4 w-4 mr-2" />
                Share Profile
              </Button>
            </div>

            {/* Location & Join Date */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center mt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{user.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Joined {user.joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements & Badges Strip */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 text-center">🏆 Achievements & Badges</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {user.badges.map((badge, index) => (
              <Badge key={index} className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-orange-700 border-orange-200 px-4 py-2">
                <Trophy className="h-4 w-4 mr-1" />
                {badge}
              </Badge>
            ))}
            {user.engagementBadges.map((badge, index) => (
              <Badge key={index} className="bg-gradient-to-r from-green-400/20 to-blue-500/20 text-blue-700 border-blue-200 px-4 py-2">
                <Target className="h-4 w-4 mr-1" />
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        {/* Progressive Enrichment Content */}
        <div className="px-6">
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="health">Health Snapshot</TabsTrigger>
            </TabsList>

            {/* Posts Tab - Social Feed First */}
            <TabsContent value="posts" className="space-y-4">
              {user.socialPosts.map((post) => (
                <Card key={post.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{user.name}</span>
                          <span className="text-muted-foreground text-sm">{user.handle}</span>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-muted-foreground text-sm">{post.date}</span>
                        </div>
                        <p className="mt-2 text-foreground/90">{post.content}</p>
                        {post.image && (
                          <div className="mt-3 rounded-lg overflow-hidden">
                            <img src={post.image} alt="Post image" className="w-full h-48 object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 pt-2 border-t">
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Heart className="h-4 w-4" />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Share className="h-4 w-4" />
                        <span className="text-sm">{post.shares}</span>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Media Tab - TikTok/Instagram Style */}
            <TabsContent value="media" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.mediaContent.map((media) => (
                  <Card key={media.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img src={media.thumbnail} alt={media.title} className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 text-white mb-1">
                          {getMediaIcon(media.type)}
                          <span className="text-sm font-medium">{media.duration}</span>
                        </div>
                        <h4 className="font-semibold text-white text-sm">{media.title}</h4>
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-black/40 text-white">
                          {media.type}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{media.views ? `${media.views.toLocaleString()} views` : `${media.plays} plays`}</span>
                        <span>{media.date}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Groups Tab - Community Engagement */}
            <TabsContent value="groups" className="space-y-6">
              <div className="grid gap-4">
                {user.communities.map((community) => (
                  <Card key={community.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{community.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {community.members.toLocaleString()} members • {community.type}
                          </p>
                        </div>
                      </div>                      
                      {community.role && (
                        <Badge className={getRoleColor(community.role)}>
                          {community.role}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Health Snapshot Tab - Progressive Health Layer */}
            <TabsContent value="health" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Vitana Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-center space-y-2">
                      <div className="text-4xl font-bold text-primary">{user.stats.vitanaScore}</div>
                      <div className="text-muted-foreground">{user.longevityArchetype}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle>Engagement Badges</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-2">
                      {user.engagementBadges.map((badge, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          <span className="text-sm">{badge}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 md:col-span-2">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle>Interests & Auto-Generated Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((interest) => (
                        <Badge key={interest} variant="outline" className="hover:bg-primary/10 transition-colors">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}