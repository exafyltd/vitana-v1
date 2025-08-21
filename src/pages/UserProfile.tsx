import { useParams } from "react-router-dom";
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
  Target
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  title: string;
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
  };
  badges: string[];
  interests: string[];
  recentActivity: {
    type: 'post' | 'achievement' | 'group_join';
    title: string;
    description: string;
    date: string;
  }[];
}

const mockUsers: Record<string, UserProfile> = {
  '1': {
    id: '1',
    name: 'Sarah Miller',
    title: 'Yoga Enthusiast & Meditation Teacher',
    bio: 'Passionate about helping others find inner peace through mindful movement and breathing techniques. Certified yoga instructor with 8+ years of experience in holistic wellness.',
    location: 'San Francisco, CA',
    joinDate: 'March 2023',
    avatar: '/lovable-uploads/sarah-miller-avatar.jpg',
    verified: true,
    stats: {
      posts: 142,
      followers: 1250,
      following: 380,
      vitanaScore: 92
    },
    badges: ['Mindfulness Master', 'Community Helper', 'Wellness Warrior'],
    interests: ['Yoga', 'Meditation', 'Mental Health', 'Nutrition', 'Nature'],
    recentActivity: [
      {
        type: 'post',
        title: 'Morning Flow Routine',
        description: 'Shared a 15-minute energizing yoga sequence perfect for mornings',
        date: '2 days ago'
      },
      {
        type: 'achievement',
        title: 'Meditation Streak',
        description: 'Completed 30 consecutive days of daily meditation',
        date: '1 week ago'
      },
      {
        type: 'group_join',
        title: 'Joined Mindful Nutrition',
        description: 'Connected with like-minded individuals focused on conscious eating',
        date: '2 weeks ago'
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Dr. Roberts',
    title: 'Certified Health Coach',
    bio: 'Board-certified physician specializing in preventive medicine and holistic wellness. Passionate about empowering individuals to take control of their health journey.',
    location: 'Austin, TX',
    joinDate: 'January 2023',
    avatar: '/lovable-uploads/dr-roberts-avatar.jpg',
    verified: true,
    stats: {
      posts: 89,
      followers: 2150,
      following: 156,
      vitanaScore: 96
    },
    badges: ['Health Expert', 'Verified Professional', 'Top Contributor'],
    interests: ['Preventive Medicine', 'Nutrition Science', 'Sleep Health', 'Exercise Physiology'],
    recentActivity: [
      {
        type: 'post',
        title: 'Heart Health Guidelines',
        description: 'Shared evidence-based tips for cardiovascular wellness',
        date: '1 day ago'
      },
      {
        type: 'achievement',
        title: 'Expert Status',
        description: 'Reached 100+ helpful health consultations',
        date: '3 days ago'
      }
    ]
  }
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageSquare className="h-4 w-4" />;
      case 'achievement': return <Trophy className="h-4 w-4" />;
      case 'group_join': return <Users className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={`${user.name} - VITANA`}
        description={`${user.name}: ${user.bio}`}
      />

      <div className="space-y-6">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10 rounded-t-2xl" />
          
          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4 md:mt-16">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
                    {user.verified && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground">{user.title}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{user.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {user.joinDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:mt-16">
                <Card className="p-4">
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-primary">{user.stats.vitanaScore}</div>
                    <div className="text-xs text-muted-foreground">Vitana Score</div>
                  </div>
                </Card>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-semibold">{user.stats.posts}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  <div>
                    <div className="font-semibold">{user.stats.followers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold">{user.stats.following}</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-6">
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground/80">{user.bio}</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((interest) => (
                        <Badge key={interest} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              {user.recentActivity.map((activity, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {user.badges.map((badge) => (
                  <Card key={badge}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{badge}</h4>
                          <p className="text-sm text-muted-foreground">Achievement unlocked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}