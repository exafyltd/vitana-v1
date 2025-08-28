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
      case 'admin': return 'bg-primary text-primary-foreground';
      case 'moderator': return 'bg-secondary text-secondary-foreground';
      case 'professional': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUserRoles = () => {
    const roles = [];
    if (user.verified) roles.push('Professional');
    if (user.stats.vitanaScore > 700) roles.push('VIP');
    roles.push('Community');
    return roles;
  };

  return (
    <AppLayout>
      <SEO 
        title={`${user.name} - VITANA`}
        description={`${user.name}: ${user.bio}`}
      />

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="relative">
          {/* Vitana Index Badge - Top Right Corner */}
          <div className="absolute top-6 right-6 z-20">
            <div 
              className="relative cursor-pointer group"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              {/* Glowing ring effect */}
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-secondary animate-pulse blur-sm group-hover:blur-md transition-all duration-300" />
              
              {/* Main badge - Perfect circle with masking */}
              <div 
                className="relative w-24 h-24 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  borderRadius: '50%',
                  overflow: 'hidden',
                  aspectRatio: '1/1',
                  background: `
                    radial-gradient(120% 120% at 50% 35%, rgba(255,255,255,.85) 0%, rgba(255,255,255,.35) 35%, rgba(0,0,0,.08) 85%, rgba(0,0,0,0) 100%),
                    linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--secondary)) 100%)
                  `,
                  boxShadow: 'inset 0 8px 16px rgba(0,0,0,.08), inset 0 -4px 8px rgba(0,0,0,.05)'
                }}
              >
                <div className="text-2xl font-black tracking-tight leading-none" style={{color: '#006D5B'}}>{user.stats.vitanaScore}</div>
                <div className="text-[8px] font-medium tracking-wide leading-tight" style={{color: '#2C2C2C'}}>VITANA Index</div>
              </div>
              
              {/* Top % indicator */}
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                TOP 10%
              </div>
            </div>
            
            {/* Archetype below badge */}
            <div className="mt-2 text-center">
              <div className="text-xs font-medium text-muted-foreground">{user.longevityArchetype}</div>
            </div>
          </div>

          {/* Hero Section - Human-Centered Layout */}
          <div className="px-6 pt-20 pb-8">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* Profile Picture - Centered at Top */}
              <Avatar className="h-32 w-32 mx-auto border-4 border-white/50 shadow-2xl">
                <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              {/* Name, Handle, and Role Badges */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">{user.name}</h1>
                  {user.verified && (
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                
                <p className="text-lg text-muted-foreground font-medium">{user.handle}</p>
                
                {/* Role Badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {getUserRoles().map((role, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons - Centered Row */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button className="px-6 rounded-full bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
                <Button variant="outline" className="px-6 rounded-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="ghost" className="px-6 rounded-full">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Stats Row - Instagram Style */}
              <div className="flex items-center justify-center gap-8 md:gap-12 py-6 border-y border-border/50">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{user.stats.followers.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{user.stats.posts}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{user.stats.mediaUploads}</div>
                  <div className="text-sm text-muted-foreground">Media</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{user.stats.groupsJoined}</div>
                  <div className="text-sm text-muted-foreground">Groups</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Achievements & Badges Strip */}
        <div className="px-6">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-r from-yellow-50/50 via-orange-50/50 to-red-50/50 border-yellow-200/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-6 text-center flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Achievements & Streaks
                </h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {user.badges.map((badge, index) => (
                    <div key={index} className="group cursor-pointer">
                      <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-700 border-yellow-300/50 px-4 py-2 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-200 hover:scale-105">
                        <Trophy className="h-3 w-3 mr-1.5" />
                        {badge}
                      </Badge>
                    </div>
                  ))}
                  {user.engagementBadges.map((badge, index) => (
                    <div key={index} className="group cursor-pointer">
                      <Badge className="bg-gradient-to-r from-green-400/20 to-blue-500/20 text-green-700 border-green-300/50 px-4 py-2 hover:from-green-400/30 hover:to-blue-500/30 transition-all duration-200 hover:scale-105">
                        <Target className="h-3 w-3 mr-1.5" />
                        {badge}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabbed Content Area */}
        <div className="px-6">
          <div className="max-w-6xl mx-auto">
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

              {/* Health Snapshot Tab */}
              <TabsContent value="health" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Five Pillar Contributors to Vitana Index */}
                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        Exercise
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">85%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-green-500 h-2 rounded-full w-[85%]"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-blue-500">😴</span>
                        Sleep
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">78%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-blue-500 h-2 rounded-full w-[78%]"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-orange-500">🥗</span>
                        Nutrition
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">92%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-orange-500 h-2 rounded-full w-[92%]"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-cyan-500">💧</span>
                        Hydration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-cyan-600">73%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-cyan-500 h-2 rounded-full w-[73%]"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-purple-500">🧠</span>
                        Mental Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">89%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-purple-500 h-2 rounded-full w-[89%]"></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-red-500">🩺</span>
                        Biomarkers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">81%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div className="bg-red-500 h-2 rounded-full w-[81%]"></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Longevity Timeline & Impact Cards */}
        <div className="px-6 pb-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Longevity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-semibold">{user.joinDate}</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Vitana Index Progress</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full" style={{width: `${(user.stats.vitanaScore / 1000) * 100}%`}}></div>
                    </div>
                    <span className="text-sm font-medium">{user.stats.vitanaScore}/1000</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  📈 +47 points this month
                </div>
              </CardContent>
            </Card>

            {/* My Impact Card */}
            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent" />
                  My Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">12</div>
                    <div className="text-xs text-muted-foreground">Friends Invited</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">5</div>
                    <div className="text-xs text-muted-foreground">Services Hosted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">28</div>
                    <div className="text-xs text-muted-foreground">Referrals Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">$340</div>
                    <div className="text-xs text-muted-foreground">Rewards Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}