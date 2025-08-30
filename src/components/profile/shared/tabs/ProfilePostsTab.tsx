import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share, Edit3, MapPin, ExternalLink, Star } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfilePostsTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditAbout?: () => void;
  onEditShowcase?: () => void;
}

export function ProfilePostsTab({ profile, scope, editMode, onEditAbout, onEditShowcase }: ProfilePostsTabProps) {
  // Mock posts data - replace with real data
  const mockPosts = [
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
      image: profile.avatarUrl,
      likes: 156,
      comments: 23,
      shares: 11,
      date: '1 day ago',
      type: 'image'
    }
  ];

  return (
    <div className="space-y-4">
      {/* About Section */}
      {profile.bio && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">About</h3>
            {editMode && onEditAbout && (
              <Button variant="outline" size="sm" onClick={onEditAbout}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit About
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mb-4">{profile.bio}</p>
          
          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </div>
          )}
          
          {/* Links */}
          {profile.links && profile.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.links.map((link, index) => (
                <Button key={index} variant="link" size="sm" className="h-auto p-0">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {link.label}
                </Button>
              ))}
            </div>
          )}
          
          {/* Languages */}
          {profile.languages && profile.languages.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.languages.map((language, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Showcase Section */}
      {editMode && onEditShowcase && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Featured Content</h3>
            <Button variant="outline" size="sm" onClick={onEditShowcase}>
              <Star className="h-4 w-4 mr-2" />
              Edit Showcase
            </Button>
          </div>
          <p className="text-muted-foreground">
            Select posts and content to feature at the top of your profile
          </p>
        </Card>
      )}

      {/* Posts */}
      {mockPosts.map((post) => (
        <Card key={post.id} className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{profile.name}</span>
                  <span className="text-muted-foreground text-sm">@{profile.handle}</span>
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
    </div>
  );
}