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
}

export function ProfilePostsTab({ profile, scope, editMode, onEditAbout }: ProfilePostsTabProps) {
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
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* About Section */}
      {profile.bio && (
        <Card className="p-6 bg-white/70 dark:bg-black/30 backdrop-blur-xl border-white/30 shadow-sm rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">About</h3>
            {editMode && onEditAbout && (
              <Button variant="outline" size="sm" onClick={onEditAbout}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit About
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mb-4 leading-relaxed">{profile.bio}</p>
          
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

      {/* Posts */}
      {mockPosts.map((post) => (
        <Card 
          key={post.id} 
          className="p-6 bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-sm rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-violet-200/50 dark:ring-violet-400/20">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">{profile.name}</span>
                  <span className="text-muted-foreground/70 text-sm">@{profile.handle} • {post.date}</span>
                </div>
                <p className="mt-2.5 text-foreground/90 leading-[1.7]">
                  {post.content.split(' ').map((word, i) => {
                    if (word.startsWith('#') || word.startsWith('@')) {
                      return (
                        <span key={i} className="bg-gradient-to-r from-violet-500 to-blue-400 bg-clip-text text-transparent font-medium">
                          {word}{' '}
                        </span>
                      );
                    }
                    return word + ' ';
                  })}
                </p>
                {post.image && (
                  <div className="mt-4 rounded-xl overflow-hidden shadow-md">
                    <img src={post.image} alt="Post image" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-white/20 my-3" />
            
            <div className="flex items-center gap-6 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-50/50 to-sky-50/50 dark:from-white/5 dark:to-white/10">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-pink-500 transition-colors group">
                <Heart className="h-4 w-4 group-hover:fill-current transition-all" />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group">
                <MessageSquare className="h-4 w-4 group-hover:fill-current transition-all" />
                <span className="text-sm font-medium">{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-violet-500 transition-colors group">
                <Share className="h-4 w-4 group-hover:fill-current transition-all" />
                <span className="text-sm font-medium">{post.shares}</span>
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}